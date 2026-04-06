import urllib.request
import re
import os

urls = [
    'https://petarpeshev.com/',
    'https://petarpeshev.com/%d0%ba%d0%be%d1%80%d0%bf%d0%be%d1%80%d0%b0%d1%82%d0%b8%d0%b2%d0%bd%d0%b0-%d1%84%d0%be%d1%82%d0%be%d0%b3%d1%80%d0%b0%d1%84%d0%b8%d1%8f/',
    'https://petarpeshev.com/%d0%ba%d0%be%d1%80%d0%bf%d0%be%d1%80%d0%b0%d1%82%d0%b8%d0%b2%d0%b5%d0%bd-%d0%bf%d0%be%d1%80%d1%82%d1%80%d0%b5%d1%82/',
    'https://petarpeshev.com/%d0%bc%d0%be%d0%b4%d0%b5%d0%bd-%d1%84%d0%be%d1%82%d0%be%d0%b3%d1%80%d0%b0%d1%84-2/',
    'https://petarpeshev.com/%d0%bf%d0%be%d1%80%d1%82%d1%80%d0%b5%d1%82%d0%bd%d0%b0-%d1%84%d0%be%d1%82%d0%be%d0%b3%d1%80%d0%b0%d1%84%d0%b8%d1%8f/',
    'https://petarpeshev.com/glamour/',
    'https://petarpeshev.com/%d0%b0%d0%bc%d0%b1%d1%80%d0%be%d1%82%d0%b8%d0%bf%d0%b8%d1%8f/',
    'https://petarpeshev.com/%d1%81%d0%bf%d0%be%d1%80%d1%82%d0%bd%d0%b0-%d0%b8-%d1%82%d0%b0%d0%bd%d1%86%d0%be%d0%b2%d0%b0-%d1%84%d0%be%d1%82%d0%be%d0%b3%d1%80%d0%b0%d1%84%d0%b8%d1%8f/'
]

if not os.path.exists('images'):
    os.makedirs('images')

headers = {'User-Agent': 'Mozilla/5.0'}

img_links = set()

for url in urls:
    try:
        req = urllib.request.Request(url, headers=headers)
        html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
        
        # Simple regex to find img src attributes
        matches = re.findall(r'<img[^>]+src=[\"\'](http[s]?://[^\"]+)[\"\']', html)
        for src in matches:
            # remove srcset dimensions to get max res
            src = re.sub(r'-\d+x\d+(?=\.\w+$)', '', src)
            if 'petarpeshev.com' in src and (src.endswith('.jpg') or src.endswith('.jpeg') or src.endswith('.png')):
                img_links.add(src)
    except Exception as e:
        print(f"Error fetching {url}: {e}")

for url in img_links:
    try:
        filename = url.split('/')[-1]
        req = urllib.request.Request(url, headers=headers)
        img_data = urllib.request.urlopen(req).read()
        with open(os.path.join('images', filename), 'wb') as handler:
            handler.write(img_data)
        print(f"Downloaded {filename}")
    except Exception as e:
        print(f"Failed to download {url}: {e}")

print("Images downloaded:", len(img_links))
