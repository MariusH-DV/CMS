Window.SetBackgroundTopColor(0.043, 0.063, 0.125);
Window.SetBackgroundBottomColor(0.043, 0.063, 0.125);

logo.image = Image("logo.png");
logo.sprite = Sprite(logo.image);

screen_width = Window.GetWidth();
screen_height = Window.GetHeight();

logo.sprite.SetX(screen_width / 2 - logo.image.GetWidth() / 2);
logo.sprite.SetY(screen_height / 2 - logo.image.GetHeight() / 2);
