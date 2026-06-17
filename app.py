import time
import requests
import xml.etree.ElementTree as ET
import re
from datetime import datetime
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
namespaces = {'atom': 'http://www.w3.org/2005/Atom'}

# Cache storage
cache = {
    'data': None,
    'last_updated': 0
}
CACHE_DURATION = 600 # 10 minutes cache duration

def clean_html_for_snippet(html_content):
    """Strip HTML tags to get raw text for tweet snippets."""
    # Replace line breaks and paragraph breaks with spaces
    text = re.sub(r'</?(p|h3|li|ul|ol|br|div)[^>]*>', ' ', html_content)
    # Strip any remaining HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    # Normalize multiple whitespace characters to a single space
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_release_feed():
    """Fetches the XML feed and parses it into a structured Python object."""
    response = requests.get(FEED_URL, timeout=10)
    response.raise_for_status()
    root = ET.fromstring(response.content)
    
    entries = root.findall('atom:entry', namespaces)
    releases = []
    
    for entry in entries:
        title = entry.find('atom:title', namespaces).text
        updated_str = entry.find('atom:updated', namespaces).text
        
        # Link parsing
        link = ""
        link_elem = entry.find("atom:link[@rel='alternate']", namespaces)
        if link_elem is None:
            link_elem = entry.find("atom:link", namespaces)
        if link_elem is not None:
            link = link_elem.attrib.get('href', '')
            
        content_elem = entry.find('atom:content', namespaces)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Split content into sub-updates based on <h3> tags
        matches = list(re.finditer(r'<h3[^>]*>(.*?)</h3>', content_html, re.DOTALL))
        updates = []
        
        if not matches:
            # Fallback if no <h3> tags are found
            snippet = clean_html_for_snippet(content_html)
            updates.append({
                'id': f"update_{int(time.time())}_{title.lower().replace(' ', '_')}_0",
                'type': 'Update',
                'body': content_html,
                'snippet': snippet[:200] + ('...' if len(snippet) > 200 else '')
            })
        else:
            for idx, match in enumerate(matches):
                type_str = match.group(1).strip()
                start_idx = match.end()
                end_idx = matches[idx+1].start() if idx + 1 < len(matches) else len(content_html)
                body_html = content_html[start_idx:end_idx].strip()
                
                snippet = clean_html_for_snippet(body_html)
                updates.append({
                    'id': f"update_{title.lower().replace(' ', '_').replace(',', '')}_{idx}",
                    'type': type_str,
                    'body': body_html,
                    'snippet': snippet[:200] + ('...' if len(snippet) > 200 else '')
                })
                
        # Parse datetime for sorting or presentation
        formatted_date = title
        try:
            # Try to format the ISO timestamp to a cleaner date representation
            dt = datetime.fromisoformat(updated_str)
            formatted_date = dt.strftime('%B %d, %Y')
        except Exception:
            pass
            
        releases.append({
            'date': formatted_date,
            'iso_date': updated_str,
            'link': link,
            'updates': updates
        })
        
    return releases

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    if force_refresh or not cache['data'] or (current_time - cache['last_updated'] > CACHE_DURATION):
        try:
            cache['data'] = parse_release_feed()
            cache['last_updated'] = current_time
            return jsonify({
                'success': True,
                'data': cache['data'],
                'source': 'network',
                'timestamp': current_time
            })
        except Exception as e:
            # Fallback to cache if network call fails
            if cache['data']:
                return jsonify({
                    'success': True,
                    'data': cache['data'],
                    'source': 'cache_fallback',
                    'timestamp': cache['last_updated'],
                    'error': str(e)
                })
            return jsonify({
                'success': False,
                'error': f"Failed to fetch and parse release feed: {str(e)}"
            }), 500
    else:
        return jsonify({
            'success': True,
            'data': cache['data'],
            'source': 'cache',
            'timestamp': cache['last_updated']
        })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
