import os

def animate_svg(svg_path):
    with open(svg_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Remove old injected CSS if any
    start_css = "@keyframes float1"
    if start_css in content:
        print(f"Animation already present in {svg_path} - refreshing it.")

    # 1. Inject CSS for Keyframes ONLY
    # We will use inline styles for the rest to ensure it works reliably in img tags
    css_to_inject = """
@keyframes float1 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-7px); } }
@keyframes float2 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
@keyframes float3 { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-5px); } }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
.anim-float1 { animation: float1 4s ease-in-out infinite; }
.anim-float2 { animation: float2 5s ease-in-out infinite 1s; }
.anim-float3 { animation: float3 4.5s ease-in-out infinite 2s; }
.anim-pulse { animation: pulse 3s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
"""
    
    # Very crude replacement logic: if we already injected before, we don't want to duplicate.
    if "<style>" in content and "@keyframes float1" not in content:
        content = content.replace("</style>", css_to_inject + "</style>")

    # 2. Add classes to groups
    # First, let's reset to base by removing classes if they were already there, 
    # to avoid `class="anim-float1 anim-float1"`
    for cls in ["class=\"anim-float1\"", "class=\"anim-float2\"", "class=\"anim-float3\"", "class=\"anim-pulse\""]:
        content = content.replace(" " + cls, "")

    replacements = {
        'id="_Coins_Stack_"': 'id="_Coins_Stack_" class="anim-float1"',
        'id="_Single_Coin_"': 'id="_Single_Coin_" class="anim-float2"',
        'id="_Sale_Tag_"': 'id="_Sale_Tag_" class="anim-float3"',
        'id="_Like_Button_"': 'id="_Like_Button_" class="anim-float1"',
        'id="_Like_Button_2"': 'id="_Like_Button_2" class="anim-float2"',
        'id="_3D_Stars_"': 'id="_3D_Stars_" class="anim-pulse"',
        'id="_Satrs_"': 'id="_Satrs_" class="anim-pulse"',
        'id="_Card_"': 'id="_Card_" class="anim-float2"',
        'id="_Gifts_Boxes_"': 'id="_Gifts_Boxes_" class="anim-float3"',
        'id="_Open_Gift_box_with_heart_"': 'id="_Open_Gift_box_with_heart_" class="anim-float1" style="transform-origin: center; transform-box: fill-box;"',
        'id="_Ornament_"': 'id="_Ornament_" class="anim-float2"',
    }

    for old, new in replacements.items():
        content = content.replace(old, new)

    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"SVG animations applied to {svg_path}.")

hero_light = r"c:\Users\Design_Bench_12\Documents\claude-loyalty-program\public\assets\images\landing\hero\hero-image-light.svg"
hero_dark = r"c:\Users\Design_Bench_12\Documents\claude-loyalty-program\public\assets\images\landing\hero\hero-image-dark.svg"

try:
    animate_svg(hero_light)
except Exception as e:
    print("Error on light map:", e)

try:
    animate_svg(hero_dark)
except Exception as e:
    print("Error on dark map:", e)
