import urllib.request
import re
import os
import json

urls_info = [
    {
        "url": "https://petarpeshev.com/%d0%ba%d0%be%d1%80%d0%bf%d0%be%d1%80%d0%b0%d1%82%d0%b8%d0%b2%d0%bd%d0%b0-%d1%84%d0%be%d1%82%d0%be%d0%b3%d1%80%d0%b0%d1%84%d0%b8%d1%8f/",
        "filter_id": "corporate",
        "title": "Рекламна и Корпоративна Фотография"
    },
    {
        "url": "https://petarpeshev.com/%d0%ba%d0%be%d1%80%d0%bf%d0%be%d1%80%d0%b0%d1%82%d0%b8%d0%b2%d0%b5%d0%bd-%d0%bf%d0%be%d1%80%d1%82%d1%80%d0%b5%d1%82-2/",
        "filter_id": "corporate_portrait",
        "title": "Корпоративен Портрет"
    },
    {
        "url": "https://petarpeshev.com/%d0%bc%d0%be%d0%b4%d0%b5%d0%bd-%d1%84%d0%be%d1%82%d0%be%d0%b3%d1%80%d0%b0%d1%84-2/",
        "filter_id": "fashion",
        "title": "Модна Фотография"
    },
    {
        "url": "https://petarpeshev.com/%d0%bf%d0%be%d1%80%d1%82%d1%80%d0%b5%d1%82%d0%bd%d0%b0-%d1%84%d0%be%d1%82%d0%be%d0%b3%d1%80%d0%b0%d1%84%d0%b8%d1%8f/",
        "filter_id": "portrait",
        "title": "Портретна Фотография"
    },
    {
        "url": "https://petarpeshev.com/glamour/",
        "filter_id": "glamour",
        "title": "Glamour"
    },
    {
        "url": "https://petarpeshev.com/%d0%b0%d0%bc%d0%b1%d1%80%d0%be%d1%82%d0%b8%d0%bf%d0%b8%d1%8f/",
        "filter_id": "ambrotype",
        "title": "Амбротипия"
    },
    {
        "url": "https://petarpeshev.com/%d1%81%d0%bf%d0%be%d1%80%d1%82%d0%bd%d0%b0-%d0%b8-%d1%82%d0%b0%d0%bd%d1%86%d0%be%d0%b2%d0%b0-%d1%84%d0%be%d1%82%d0%be%d0%b3%d1%80%d0%b0%d1%84%d0%b8%d1%8f/",
        "filter_id": "sport",
        "title": "Спорт и Танц"
    }
]

if not os.path.exists('images'):
    os.makedirs('images')

headers = {'User-Agent': 'Mozilla/5.0'}

data_output = {
    "categories": [],
    "items": []
}

global_id = 1
downloaded_files = set(os.listdir('images'))

for info in urls_info:
    try:
        req = urllib.request.Request(info['url'], headers=headers)
        html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
        
        # Extract text (simple approach: extract content in standard paragraph tags, avoiding footer/menu text if possible)
        # Using a simple regex to get text inside <p> or <div class="avia_textblock...">
        # This might include some junk, but we'll try to find chunks > 50 chars
        paragraphs = re.findall(r'<p[^>]*>(.*?)</p>', html, re.DOTALL)
        clean_text = []
        for p in paragraphs:
            # strip tags
            t = re.sub(r'<[^>]+>', '', p).strip()
            if len(t) > 30 and 'cookie' not in t.lower() and 'all rights reserved' not in t.lower():
                clean_text.append(t)
        
        category_description = " ".join(clean_text)
        
        data_output['categories'].append({
            "id": info["filter_id"],
            "title": info["title"],
            "description": category_description
        })
        
        # Extract images
        matches = re.findall(r'<img[^>]+src=[\"\'](http[s]?://[^\"]+)[\"\']', html)
        # also match a tags that link to images (often used in lightbox galleries)
        a_matches = re.findall(r'<a[^>]+href=[\"\'](http[s]?://[^\"]+\.(?:jpg|jpeg|png))[\"\']', html, re.IGNORECASE)
        
        all_img_urls = set(matches + a_matches)
        
        for src in all_img_urls:
            # remove srcset dimensions to get max res
            src = re.sub(r'-\d+x\d+(?=\.\w+$)', '', src)
            if 'petarpeshev.com' in src and (src.endswith('.jpg') or src.endswith('.jpeg') or src.endswith('.png')):
                filename = src.split('/')[-1]
                
                # Download if not exists
                if filename not in downloaded_files:
                    try:
                        img_req = urllib.request.Request(src, headers=headers)
                        img_data = urllib.request.urlopen(img_req).read()
                        with open(os.path.join('images', filename), 'wb') as handler:
                            handler.write(img_data)
                        downloaded_files.add(filename)
                    except Exception as e:
                        print(f"Error downloading {src}: {e}")
                        continue
                
                # Check for duplicates across categories
                if not any(item['image'] == f"images/{filename}" for item in data_output['items']):
                    data_output['items'].append({
                        "id": global_id,
                        "title": "Фотография",
                        "category": info["filter_id"],
                        "image": f"images/{filename}",
                        "description": info["title"]
                    })
                    global_id += 1
                
    except Exception as e:
        print(f"Error processing {info['url']}: {e}")

# write data to data.js
js_content = f"const portfolioData = {json.dumps(data_output, ensure_ascii=False, indent=4)};"

with open('data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Successfully processed {len(data_output['items'])} items.")
