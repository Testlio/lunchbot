# LunchBot

LunchBot is a simple SlackBot, for scraping Facebook pages of local restaurants for daily/lunch offers. The current state of the bot is very naive, making assumptions about what constitutes a Facebook post with lunch offer etc.

## Installation

The bot itself is a simple node.js application, in order to run it, you need to configure a new bot on [Slack](https://api.slack.com/bot-users) - you need to store the API key for the application. In addition, you should set up a new app on Facebook, noting down the App ID and Secret, both of which the bot also needs to operate.

## Running

You can simply run the bot with the following line. This will both set the necessary environmental variables as well as start the app.

```bash
BOT_SLACK_API_KEY={your_slack_api_key_here} BOT_FB_APP_ID={your_fb_app_id_here} BOT_FB_APP_SECRET={your_fb_app_secret_here} node index.js
```

Alternatively, you can set up a free [Heroku](http://heroku.com) app, defining the variables there and letting the specified Procfile do the rest.

## Architecture

The app consists of two main components: the bot and the sources of information. Currently, the app simply creates the bot and defines a few sources for restaurants in Tallinn. The code should be sufficiently simple to understand and modify, most importantly, `FacebookSource`, the representation of a FB page of interest should be looked at, as well how the predefined locations are handled in `index.js`.

## About Us

Release your app with confidence. Testlio’s full-service mobile app testing solution allows you to offload your QA with the most flexible requirements. All we need is your build and our global community of expert testers will give your app the tender love and care it deserves. Join our [growing team](https://www.testlio.com).

## License

The MIT License (MIT)

Copyright (c) 2015 Testlio, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
