import { Scene, GameObjects } from 'phaser';
import { VimEngine } from '../vim/VimEngine';

const FONT_HEIGHT = 24;
const SCROLLOFF_ROWS = 5;
const SCROLLOFF_COLS = 5;

export class Game extends Scene {
	private engine!: VimEngine;

	private cursorRect!: GameObjects.Rectangle;
	private rowTexts: Map<number, GameObjects.Text> = new Map();

	private fontWidth: number = 14;
	private gutterWidth: number = 0;

	private statusBarBg!: GameObjects.Rectangle;
	private statusBarLeft!: GameObjects.Text;
	private statusBarRight!: GameObjects.Text;

	private gutterBg!: GameObjects.Rectangle;
	private lineNumbers: GameObjects.Text[] = [];

	private firstVisibleRow: number = 0;
	private firstVisibleCol: number = 0;

	constructor() {
		super('Game');
	}

	create() {
		this.cameras.main.setBackgroundColor('#1e1e1e');
		this.cameras.main.setBounds(0, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);

		// Initialize VimEngine
		this.engine = new VimEngine();

		const tempText = this.add.text(0, 0, 'X'.repeat(50), {
			fontFamily: 'monospace',
			fontSize: `${FONT_HEIGHT}px`,
			resolution: 2
		});
		this.fontWidth = tempText.width / 50;
		tempText.destroy();
		this.gutterWidth = 4 * this.fontWidth;

		this.gutterBg = this.add.rectangle(0, 0, this.gutterWidth, this.cameras.main.height, 0x1e1e1e);
		this.gutterBg.setOrigin(0, 0);
		this.gutterBg.setScrollFactor(0, 0);
		this.gutterBg.setDepth(40);

		const visibleLines = Math.ceil(this.cameras.main.height / FONT_HEIGHT) + 2;
		for (let i = 0; i < visibleLines; i++) {
			const text = this.add.text(this.gutterWidth - this.fontWidth, i * FONT_HEIGHT, '', {
				fontFamily: 'monospace',
				fontSize: `${FONT_HEIGHT}px`,
				color: '#858585',
				align: 'right'
			});
			text.setOrigin(1, 0);
			text.setScrollFactor(0, 1);
			text.setDepth(50);
			this.lineNumbers.push(text);
		}

		this.cursorRect = this.add.rectangle(0, 0, this.fontWidth, FONT_HEIGHT, 0x0099ff, 0.5);
		this.cursorRect.setOrigin(0, 0);

		// Add status bar at the bottom
		const statusHeight = 26;
		const statusY = this.cameras.main.height - statusHeight;

		this.statusBarBg = this.add.rectangle(0, statusY, this.cameras.main.width, statusHeight, 0x333333);
		this.statusBarBg.setOrigin(0, 0);
		this.statusBarBg.setScrollFactor(0, 0);
		this.statusBarBg.setDepth(100);

		this.statusBarLeft = this.add.text(10, statusY + 2, '', {
			fontFamily: 'monospace',
			fontSize: '20px',
			color: '#d4d4d4'
		});
		this.statusBarLeft.setScrollFactor(0, 0);
		this.statusBarLeft.setDepth(101);

		this.statusBarRight = this.add.text(this.cameras.main.width - 10, statusY + 2, '', {
			fontFamily: 'monospace',
			fontSize: '20px',
			color: '#A0A0A0', // Slightly muted color for position coordinates
			align: 'right'
		});
		this.statusBarRight.setOrigin(1, 0);
		this.statusBarRight.setScrollFactor(0, 0);
		this.statusBarRight.setDepth(101);

		// Hook Engine Events
		this.engine.onRenderRow = (row: number) => this.renderRow(row);
		this.engine.onRenderAll = () => this.renderAllLines();
		this.engine.onCursorMoved = () => this.updateCursorPosition();
		this.engine.onStatusUpdate = (left: string, right: string) => {
			this.statusBarLeft.setText(left);
			this.statusBarRight.setText(right);
		};

		this.renderAllLines();
		this.engine.triggerCursorMoved();

		if (this.input.keyboard) {
			this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
				this.engine.handleKeyDown(event);
			});
		}
	}

	update() {
		for (let i = 0; i < this.lineNumbers.length; i++) {
			const row = this.firstVisibleRow + i;
			const textObj = this.lineNumbers[i];

			if (row < 0) {
				if (textObj.text !== '') {
					textObj.setText('');
				}
			} else {
				let displayNumber = '';
				if (row === this.engine.cursorRow) {
					displayNumber = (row + 1).toString();
				} else {
					displayNumber = Math.abs(row - this.engine.cursorRow).toString();
				}
				if (textObj.text !== displayNumber) {
					textObj.setText(displayNumber);
				}
			}
			textObj.y = row * FONT_HEIGHT;
		}
	}

	private renderAllLines() {
		for (const [rowIndex, textObj] of this.rowTexts.entries()) {
			if (rowIndex >= this.engine.lines.length) {
				textObj.destroy();
				this.rowTexts.delete(rowIndex);
			}
		}
		for (let r = 0; r < this.engine.lines.length; r++) {
			this.renderRow(r);
		}
	}

	private renderRow(rowIndex: number) {
		const line = this.engine.lines[rowIndex];

		if (line !== undefined) {
			let textObj = this.rowTexts.get(rowIndex);
			if (!textObj) {
				const x = this.gutterWidth;
				const y = rowIndex * FONT_HEIGHT;
				textObj = this.add.text(x, y, line, {
					fontFamily: 'monospace',
					fontSize: `${FONT_HEIGHT}px`,
					color: '#d4d4d4',
					resolution: 2
				});
				textObj.setOrigin(0, 0);
				this.rowTexts.set(rowIndex, textObj);
			} else {
				textObj.setText(line);
			}
		} else {
			const textObj = this.rowTexts.get(rowIndex);
			if (textObj) {
				textObj.destroy();
				this.rowTexts.delete(rowIndex);
			}
		}
	}

	private updateCursorPosition() {
		this.cursorRect.x = this.gutterWidth + this.engine.cursorCol * this.fontWidth;
		this.cursorRect.y = this.engine.cursorRow * FONT_HEIGHT;

		// Vertical viewport boundary management (scrolloff)
		const visibleRows = Math.floor(this.cameras.main.height / FONT_HEIGHT);
		if (this.engine.cursorRow < this.firstVisibleRow + SCROLLOFF_ROWS) {
			this.firstVisibleRow = Math.max(0, this.engine.cursorRow - SCROLLOFF_ROWS);
		}
		if (this.engine.cursorRow > this.firstVisibleRow + visibleRows - SCROLLOFF_ROWS - 1) {
			this.firstVisibleRow = Math.max(0, this.engine.cursorRow - visibleRows + SCROLLOFF_ROWS + 1);
		}

		// Horizontal viewport boundary management (sidescrolloff)
		const visibleCols = Math.floor((this.cameras.main.width - this.gutterWidth) / this.fontWidth);
		if (this.engine.cursorCol < this.firstVisibleCol + SCROLLOFF_COLS) {
			this.firstVisibleCol = Math.max(0, this.engine.cursorCol - SCROLLOFF_COLS);
		}
		if (this.engine.cursorCol > this.firstVisibleCol + visibleCols - SCROLLOFF_COLS - 1) {
			this.firstVisibleCol = Math.max(0, this.engine.cursorCol - visibleCols + SCROLLOFF_COLS + 1);
		}

		// Snap camera strictly to grid points
		this.cameras.main.setScroll(this.firstVisibleCol * this.fontWidth, this.firstVisibleRow * FONT_HEIGHT);
	}
}
