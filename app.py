import re
import os
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "feed_cache.xml"

# In-memory cache for parsed updates
_cached_updates = []

def clean_html(html_str):
    # Strip HTML tags
    clean = re.sub(r'<[^>]+>', '', html_str)
    # Normalize spacing
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean

def truncate_tweet(text, link):
    url_len = 23
    max_text_len = 280 - url_len - 5
    if len(text) > max_text_len:
        text = text[:max_text_len - 3] + "..."
    return f"{text} {link}"

def parse_content_html(html_content, date_str, base_link):
    pattern = re.compile(r'<h3>\s*([^<]+?)\s*</h3>\s*(.*?)(?=\s*<h3>|$)', re.DOTALL | re.IGNORECASE)
    updates = []
    matches = list(pattern.finditer(html_content))
    
    if not matches:
        clean_text = clean_html(html_content)
        updates.append({
            'date': date_str,
            'type': 'Update',
            'html': html_content,
            'text': clean_text,
            'link': base_link,
            'tweet_text': truncate_tweet(f"BigQuery Update ({date_str}): {clean_text}", base_link)
        })
        return updates
        
    for idx, match in enumerate(matches):
        item_type = match.group(1).strip()
        item_html = match.group(2).strip()
        clean_text = clean_html(item_html)
        link_url = base_link
        update_id = f"{date_str.replace(' ', '_').replace(',', '')}_{idx}"
        
        updates.append({
            'id': update_id,
            'date': date_str,
            'type': item_type,
            'html': f"<h3>{item_type}</h3>\n{item_html}",
            'text': clean_text,
            'link': link_url,
            'tweet_text': truncate_tweet(f"BigQuery [{item_type}] ({date_str}): {clean_text}", link_url)
        })
        
    return updates

def fetch_and_parse_feed(force_refresh=False):
    global _cached_updates
    xml_text = None
    
    # Try fetching from web if forced or no cached data in memory/file
    if force_refresh or not os.path.exists(CACHE_FILE):
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(FEED_URL, headers=headers, timeout=10)
            if response.status_code == 200:
                xml_text = response.text
                # Save to local cache file
                with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                    f.write(xml_text)
        except Exception as e:
            print(f"Error fetching feed: {e}")
            
    # Read from local cache file if we couldn't fetch or didn't need to force refresh
    if xml_text is None and os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                xml_text = f.read()
        except Exception as e:
            print(f"Error reading cache file: {e}")
            
    if xml_text is None:
        # If cache is also missing, check if we have the initial saved file to bootstrap
        bootstrap_path = '/Users/votan/.gemini/antigravity-cli/brain/76e7ff2d-f847-4679-acb9-94795fe237cb/.system_generated/steps/26/content.md'
        if os.path.exists(bootstrap_path):
            try:
                with open(bootstrap_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                xml_lines = []
                xml_started = False
                for line in lines:
                    if line.startswith('<?xml'):
                        xml_started = True
                    if xml_started:
                        xml_lines.append(line)
                xml_text = "".join(xml_lines)
            except Exception as e:
                print(f"Error reading bootstrap file: {e}")

    if not xml_text:
        return []
        
    try:
        # Parse XML
        xml_text = xml_text.strip()
        idx = xml_text.find('<?xml')
        if idx != -1:
            xml_text = xml_text[idx:]
            
        root = ET.fromstring(xml_text)
        namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
        
        updates = []
        for entry_elem in root.findall('atom:entry', namespaces):
            title_elem = entry_elem.find('atom:title', namespaces)
            date_str = title_elem.text if title_elem is not None else ""
            
            link_elem = entry_elem.find("atom:link[@rel='alternate']", namespaces)
            if link_elem is None:
                link_elem = entry_elem.find("atom:link", namespaces)
            link_url = link_elem.attrib.get('href', '') if link_elem is not None else ''
            
            content_elem = entry_elem.find('atom:content', namespaces)
            content_html = content_elem.text if content_elem is not None else ""
            
            parsed_updates = parse_content_html(content_html, date_str, link_url)
            updates.extend(parsed_updates)
            
        _cached_updates = updates
        return updates
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return _cached_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    force = request.args.get('refresh', 'false').lower() == 'true'
    updates = fetch_and_parse_feed(force_refresh=force)
    return jsonify(updates)

if __name__ == '__main__':
    # Initialize cache on startup
    fetch_and_parse_feed()
    app.run(host='0.0.0.0', port=5001, debug=True)
