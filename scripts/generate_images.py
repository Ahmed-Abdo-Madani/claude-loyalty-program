from PIL import Image, ImageDraw

def create_image(path, size, bg_color="#9333ea", text=None):
    img = Image.new('RGBA', size, bg_color)
    img.save(path)

# resources folder
create_image("resources/icon.png", (1024, 1024))
create_image("resources/icon-foreground.png", (1024, 1024), bg_color=(0,0,0,0))
create_image("resources/icon-background.png", (1024, 1024), bg_color="#9333ea")
create_image("resources/splash.png", (2732, 2732))
create_image("resources/splash-dark.png", (2732, 2732), bg_color="#121212")

# public folder PWA icons
create_image("public/icon-192.png", (192, 192))
create_image("public/icon-512.png", (512, 512))
