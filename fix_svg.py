import re
import sys

def fix_and_animate(svg_path, base_color):
    with open(svg_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # We want to extract everything between <style> and </style>
    style_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
    if not style_match:
        print(f"No <style> in {svg_path}")
        return

    style_content = style_match.group(1)

    # Let's clean up any junk from my prior attempts
    # We will remove any @keyframes magicPurple, lines with filter:, and any .cls-3 { animation: ... }
    lines = style_content.split('\n')
    new_lines = []
    skip = False
    for line in lines:
        if "@keyframes magicPurple" in line:
            skip = True
        if skip and "}" in line and "{" not in line.split("}")[-1]: # rough check
            skip = False
            continue
        if skip:
            continue
        
        if "filter: hue-rotate" in line:
            continue
        if "50% { filter:" in line:
            continue
        if ".cls-3 { animation: magicPurple" in line:
            continue
        
        new_lines.append(line)
        
    cleaned_style = '\n'.join(new_lines)
    
    # We want to be very sure the old magicPurple logic is fully gone. Also remove loose fragments:
    cleaned_style = re.sub(r' 50% \{ filter:[^\}]+\} \}', '', cleaned_style)
    cleaned_style = re.sub(r'@keyframes magicPurple.*?\{.*?\}', '', cleaned_style, flags=re.DOTALL)
    cleaned_style = re.sub(r'\.cls-3\s*\{\s*animation:\s*magicPurple[^;]+;\s*transform-origin:\s*center;\s*\}', '', cleaned_style)

    # Ensure no floating broken keyframes
    cleaned_style = cleaned_style.strip()

    # Now add our proper fill animation!
    # User requested cyan blue. Let's use #00bcd4 -> A really nice cyan blue.
    cyan_blue = "#00f0ff" # giving it an extra bright touch
    animation_css = f"""
@keyframes pulseColor {{
    0%, 100% {{ fill: {base_color}; }}
    50% {{ fill: {cyan_blue}; }}
}}
.cls-3 {{ animation: pulseColor 6s ease-in-out infinite alternate; }}
"""

    final_style = cleaned_style + "\n" + animation_css

    content = content.replace(style_match.group(1), final_style)

    with open(svg_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Fixed and animated {svg_path} between {base_color} and {cyan_blue}")


hero_light = r"c:\Users\Design_Bench_12\Documents\claude-loyalty-program\public\assets\images\landing\hero\hero-image-light.svg"
hero_dark = r"c:\Users\Design_Bench_12\Documents\claude-loyalty-program\public\assets\images\landing\hero\hero-image-dark.svg"

# For light map, cls-3 is originally #490087
fix_and_animate(hero_light, "#490087")
# For dark map, cls-3 is originally #80008f
fix_and_animate(hero_dark, "#80008f")

