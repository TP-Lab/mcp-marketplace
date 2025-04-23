# MCP Marketplace

Welcome to the MCP Marketplace, where you can discover and utilize various MCP (Model Context Protocol) server for Claude, allowing you to interact with blockchain technology seamlessly.

## 🚧 Under Construction 🚧

We are continuously building and improving the MCP Marketplace. All MCP server listed here will be displayed in the marketplace interface. Stay tuned for updates as we add more features and capabilities!

## Currently Available MCPs

### Wallet MCP

The Wallet MCP allows you to interact with blockchain technology directly through Claude, without leaving your conversation.

#### Core Features

- **Wallet Connection**: Securely connect your crypto wallet, supporting both Solana and EVM networks.
- **Sign Transactions**: Easily sign and send transactions with Claude guiding you through each step.

#### Example Commands
- Sign Transactions: "Please send 0.1 SOL to xxx..."
- Sign message: "Please help me sign the message 'Verify my identity'"

## How to Configure Claude for MCPs

1. **Download Claude for Desktop**  
   Start by downloading the latest version of Claude for Desktop (macOS or Windows).

2. **Configure the MCP Server**  
   Open the Claude menu on your computer and select "Settings…" → "Developer" → "Edit Config".  
   Add the MCP server configuration to the file:
   ```json
   { 
     "mcpServers": { 
       "wallet-mcp": { 
         "command": "npx", 
         "args": ["wallet-mcp"] 
       } 
     } 
   }
   ```

3. **Restart Claude**  
   After updating your configuration file, restart Claude for Desktop. You should see a hammer icon in the bottom right corner of the input box.

4. **Try it out!**  
   Start interacting with the MCP features by talking to Claude.

## Join Our Community

Join our Wallet MCP Community on Telegram to connect with other users, get support, and stay updated on the latest developments:

[Join Telegram Group](https://t.me/walletmcp)

## Contributing

If you're interested in contributing to the MCP Marketplace or have ideas for new MCP server, please reach out to us.

## Learn More

Visit our website: [https://mcp.tp.xyz/](https://mcp.tp.xyz/) for more information.
