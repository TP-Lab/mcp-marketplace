# Wallet MCP

Connect your crypto wallet to AI Client.

## Overview

Wallet MCP is an npm package that provides a seamless integration between AI Clients and user's crypto wallets. This package allows AI Clients to interact with blockchain functionality through natural language processing.

## Features

- **Wallet Connection**: Easily connect to a user's wallet to retrieve their address
- **Transaction Signing**: Support for signing transactions and messages
- **Multi-chain Support**: Currently supports Ethereum and Solana networks

## Usage

### Installation

```bash
  {
    "mcpServers": {
      "wallet-mcp": {
        "command": "npx",
        "args": [
          "wallet-mcp"
        ]
      }
    }
  }
```

## Architecture

Wallet MCP interacts with the Wallet MCP DApp to handle the secure connection to user wallets and transaction signing.

### Workflow

1. **Wallet Connection**: AI Client -> Wallet MCP -> DApp -> User Wallet
2. **Transaction Signing**: AI Client -> Wallet MCP -> DApp -> User Wallet -> Signed Transaction

## License

[MIT](LICENSE)
