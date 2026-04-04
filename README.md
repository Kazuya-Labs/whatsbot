# WhatsBot

A WhatsApp bot based on the [Baileys library](https://github.com/adiwajshing/Baileys).

## Overview
This project is a WhatsApp bot that allows users to automate tasks and interact with WhatsApp functionalities programmatically. It leverages the Baileys library to connect to the WhatsApp Web API.

## Features
- **Automatic Replies**: Respond to messages based on predefined responses.
- **Message Forwarding**: Automatically forward incoming messages to specified contacts.
- **Broadcast Messages**: Send messages to multiple contacts at once.
- **Custom Commands**: Users can interact with the bot using custom commands that trigger specific actions.

## Getting Started
To get your WhatsBot up and running, follow these steps:

### Prerequisites
- Node.js (version 14 or higher)
- npm (Node package manager)
- Basic knowledge of JavaScript

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Kazuya-Labs/whatsbot.git
   cd whatsbot
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```

### Configuration
Before running the bot, you need to configure it:
- **Create a .env file in the root directory of the project** and add your configuration details:
   ```env
   SESSION=your_session_info_here
   ```

### Running the Bot
To start the bot, run the following command:
```bash
npm start
```

## Usage
Once running, the bot will listen for incoming messages, and you can interact with it through WhatsApp. Refer to the `commands` section in the bot to learn how to use custom commands and features.

## Contributing
We welcome contributions! If you'd like to contribute to the project:
1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature/new-feature
   ```
3. Commit your changes:
   ```bash
   git commit -m 'Add new feature'
   ```
4. Push the branch:
   ```bash
   git push origin feature/new-feature
   ```
5. Open a Pull Request.

## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments
- [Baileys](https://github.com/adiwajshing/Baileys) - The library that powers this bot.

For any questions or feedback, please open an issue in this repository.