# VimArena - A Tower Defense Game

A tower defense game where the battlefield is a Vim-like text editor. Built with [Phaser 3](https://phaser.io/) and TypeScript.

## Concept

In this game, you don't just click to place towers—you use Vim motions! 
- **The Arena:** The game board is a text editor. Different file types serve as different arenas.
- **The Mechanics:** Navigate using standard Vim motions (like `h`, `j`, `k`, `l`, `w`, `b`). 
- **The Goal:** Use characters to build defensive structures or attacking objects by leveraging Vim operators, counts, and modes (Normal and Insert) to defend against incoming threats.
- **Learn as you Play:** A fun and interactive way to master Vim commands and improve your text-editing speed.

## Features

* **Robust Vim Motion Engine:** Support for standard movement, counts, and operators.
* **Modes:** Seamless switching between Normal and Insert modes.
* **Infinite Canvas:** Navigate through text and open space with infinite scrolling.
* **Typing & Editing Behaviors:** Intuitive text editing built directly into the game engine.

## Getting Started

### Prerequisites

You need [Node.js](https://nodejs.org) installed to run the project.

### Installation

1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Game

Start the local development server:
```bash
npm run dev
```

### Building for Production

Create a production-ready build in the `dist/` folder:
```bash
npm run build
```

## Tech Stack

* [Phaser 3](https://github.com/phaserjs/phaser) - Game engine
* [Vite](https://vitejs.dev/) - Frontend tooling and bundling
* [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript
