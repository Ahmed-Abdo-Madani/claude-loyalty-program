
import os

def augment_svg_purples(svg_path):
    with open(svg_path, "r", encoding="utf-8") as f:
        content = f.read()

    # We want to add a pulsing gradient-like effect!
    # A great way to do this without complex structural changes is to add a hue-rotate and brightness pulse
    # to the top banner and the circles under the phone, which use `.cls-3`.
    # In light map, cls-3 is #490087 (dark purple). 
    # In dark map, cls-3 is #80008f (purple), cls-8 is #6b0087.
    # We will just target "cls-3" directly with an animation for both.

    magic_css = """
@keyframes magicPurple { 
    0%, 100% { filter: hue-rotate(0deg) brightness(1); } 
    50% { filter: hue-rotate(40deg) brightness(1.3) saturate(1.2); } 
}
.cls-3 { animation: magicPurple 6s ease-in-out infinite alternate; transform-origin: center; }
"""
    
    # Let's insert this into the <style> block if it's not already there.
    if "@keyframes magicPurple" not in content and "<style>" in content:
        # Avoid duplicating .cls-3 entirely, CSS allows overriding, but let's just append it
        # Actually safer to just add the animation rule
        magic_rule = "\n.cls-3 { animation: magicPurple 6s ease-in-out infinite alternate; transform-origin: center; }\n"
        content = content.replace("</style>", "@keyframes magicPurple { 0%, 100% { filter: hue-rotate(0deg) brightness(1); } 50% { filter: hue-rotate(45deg) brightness(1.4) saturate(1.2); } }" + magic_rule + "</style>")

        with open(svg_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Magic purple animation applied to {svg_path}.")
    else:
        print(f"Magic purple already in {svg_path} or no <style> found.")

hero_light = r"c:\Users\Design_Bench_12\Documents\claude-loyalty-program\public\assets\images\landing\hero\hero-image-light.svg"
hero_dark = r"c:\Users\Design_Bench_12\Documents\claude-loyalty-program\public\assets\images\landing\hero\hero-image-dark.svg"

try:
    augment_svg_purples(hero_light)
except Exception as e:
    print("Error on light map:", e)

try:
    augment_svg_purples(hero_dark)
except Exception as e:
    print("Error on dark map:", e)
