import { Scene, GameObjects } from 'phaser';
import { VimEngine } from '../vim/VimEngine';
import { GameState } from '../GameState';
import { EnemySystem } from '../systems/EnemySystem';
import { TowerSystem } from '../systems/TowerSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { WallSystem } from '../systems/WallSystem';

const FONT_HEIGHT = 24;
const SCROLLOFF_ROWS = 5;
const SCROLLOFF_COLS = 5;
const HUD_HEIGHT = 32;
const SIDEBAR_WIDTH = 340;
const CLIPBOARD_WIDTH = 320;

export class Game extends Scene {
    private engine!: VimEngine;
    private cursorRect!: GameObjects.Rectangle;
    private visualRect!: GameObjects.Rectangle;
    private rowTexts: Map<number, GameObjects.Text> = new Map();
    private fontWidth: number = 14;
    private firstVisibleRow: number = 0;
    private firstVisibleCol: number = 0;
    private lineNumbers: GameObjects.Text[] = [];
    private gameAreaStartX: number = SIDEBAR_WIDTH;
    private gameState!: GameState;
    private enemySystem!: EnemySystem;
    private towerSystem!: TowerSystem;
    private combatSystem!: CombatSystem;
    private wallSystem!: WallSystem;
    private hudBg!: GameObjects.Rectangle;
    private hudTowers!: GameObjects.Text;
    private hudKills!: GameObjects.Text;
    private hudTime!: GameObjects.Text;
    private hudMode!: GameObjects.Text;
    private sidebarBg!: GameObjects.Rectangle;
    private instructionsText!: GameObjects.Text;
    private clipboardBg!: GameObjects.Rectangle;
    private clipboardTitle!: GameObjects.Text;
    private clipboardCredits!: GameObjects.Text;
    private clipboardEntries: GameObjects.Text[] = [];
    private gameOverOverlay!: GameObjects.Rectangle;
    private gameOverTitle!: GameObjects.Text;
    private gameOverScore!: GameObjects.Text;
    private gameOverHint!: GameObjects.Text;

    constructor() { super('Game'); }

    create() {
        const cam = this.cameras.main;
        cam.setBackgroundColor('#1e1e1e');
        cam.setBounds(0, 0, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);

        this.engine = new VimEngine();
        const tmp = this.add.text(0, 0, 'X'.repeat(50), { fontFamily: 'monospace', fontSize: `${FONT_HEIGHT}px`, resolution: 2 });
        this.fontWidth = tmp.width / 50;
        tmp.destroy();

        this.sidebarBg = this.add.rectangle(0, 0, SIDEBAR_WIDTH, cam.height, 0x252526).setOrigin(0, 0).setScrollFactor(0).setDepth(41);
        this.instructionsText = this.add.text(8, 8, this.buildInstructionText(), {
            fontFamily: 'monospace', fontSize: '13px', color: '#cccccc',
            wordWrap: { width: SIDEBAR_WIDTH - 16, useAdvancedWrap: true },
        }).setOrigin(0, 0).setScrollFactor(0).setDepth(42);

        this.clipboardBg = this.add.rectangle(0, 0, CLIPBOARD_WIDTH, cam.height, 0x252526).setOrigin(0, 0).setScrollFactor(0).setDepth(41);
        this.clipboardTitle = this.add.text(0, 8, 'CLIPBOARD', {
            fontFamily: 'monospace', fontSize: '15px', color: '#fff',
        }).setOrigin(0, 0).setScrollFactor(0).setDepth(42);
        this.clipboardCredits = this.add.text(0, 30, '', {
            fontFamily: 'monospace', fontSize: '14px', color: '#fff',
        }).setOrigin(0, 0).setScrollFactor(0).setDepth(42);

        this.cursorRect = this.add.rectangle(0, 0, this.fontWidth, FONT_HEIGHT, 0x0099ff, 0.5).setOrigin(0, 0).setDepth(10);
        this.visualRect = this.add.rectangle(0, 0, 0, 0, 0xffff00, 0.25).setOrigin(0, 0).setDepth(9).setVisible(false);

        const visLines = Math.ceil(cam.height / FONT_HEIGHT) + 2;
        for (let i = 0; i < visLines; i++) {
            const t = this.add.text(SIDEBAR_WIDTH - 4, i * FONT_HEIGHT, '', {
                fontFamily: 'monospace', fontSize: `${FONT_HEIGHT}px`, color: '#555', align: 'right',
            }).setOrigin(1, 0).setScrollFactor(0, 1).setDepth(50);
            this.lineNumbers.push(t);
        }

        this.hudBg = this.add.rectangle(0, 0, cam.width, HUD_HEIGHT, 0x111111).setOrigin(0, 0).setDepth(100).setScrollFactor(0);
        const hudTxt = (text: string) =>
            this.add.text(0, 0, text, { fontFamily: 'monospace', fontSize: '15px', color: '#d4d4d4' })
                .setDepth(101).setScrollFactor(0);
        this.hudTowers = hudTxt('');
        this.hudKills = hudTxt('');
        this.hudMode = hudTxt('').setOrigin(0.5, 0) as GameObjects.Text;
        this.hudTime = hudTxt('').setOrigin(1, 0) as GameObjects.Text;

        this.gameOverOverlay = this.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 0.82).setOrigin(0, 0).setDepth(300).setScrollFactor(0).setVisible(false);
        this.gameOverTitle = this.add.text(cam.width / 2, cam.height / 2 - 60, 'GAME OVER', { fontFamily: 'monospace', fontSize: '52px', color: '#ff3333' }).setOrigin(0.5).setDepth(301).setScrollFactor(0).setVisible(false);
        this.gameOverScore = this.add.text(cam.width / 2, cam.height / 2 + 10, '', { fontFamily: 'monospace', fontSize: '26px', color: '#fff' }).setOrigin(0.5).setDepth(301).setScrollFactor(0).setVisible(false);
        this.gameOverHint = this.add.text(cam.width / 2, cam.height / 2 + 60, 'Press Space to restart', { fontFamily: 'monospace', fontSize: '18px', color: '#888' }).setOrigin(0.5).setDepth(301).setScrollFactor(0).setVisible(false);

        this.gameState = new GameState();
        this.wallSystem = new WallSystem(this.gameAreaStartX, this.fontWidth, FONT_HEIGHT);
        this.towerSystem = new TowerSystem(this, this.engine, this.gameAreaStartX, this.fontWidth, FONT_HEIGHT, this.gameState);
        this.enemySystem = new EnemySystem(this, this.gameState, this.gameAreaStartX, this.fontWidth, FONT_HEIGHT);
        this.combatSystem = new CombatSystem(this, this.gameState, this.towerSystem);
        this.wallSystem.towerCells = this.towerSystem.towerCells;
        this.enemySystem.setTowerProvider(() => this.towerSystem.activeTowers);
        this.gameState.onGameOver = () => this.showGameOver();
        this.gameState.onCreditsChange = () => this.updateHUD();

        this.engine.onCursorMoved = () => this.updateCursorPosition();
        this.engine.onRenderRow = (row: number) => this.renderRow(row);
        this.engine.onRenderAll = () => this.renderAllLines();
        this.engine.onStatusUpdate = (left: string, right: string) => {
            this.hudMode.setText(`${left}   ${right}`);
        };
        this.engine.onBeforeReplaceChar = (col: number, row: number): void => {
            const tower = this.towerSystem.getTowerAt(col, row);
            if (tower) {
                this.towerSystem.towerTakeDamage(tower, tower.currentHp, false);
            }
        };

        this.layoutUI();
        this.renderAllLines();
        this.engine.triggerCursorMoved();
        this.updateHUD();

        this.scale.on('resize', this.layoutUI, this);

        this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            if (this.gameState.isGameOver) {
                if (event.key === ' ' || event.code === 'Space' || event.key === 'Enter') {
                    window.location.reload();
                }
                return;
            }
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
                event.preventDefault();
            }
            this.engine.handleKeyDown(event);
        });
    }

    private layoutUI(): void {
        const cam = this.cameras.main;
        const { width, height } = cam;

        this.sidebarBg.height = height;
        this.instructionsText.setStyle({ wordWrap: { width: SIDEBAR_WIDTH - 16, useAdvancedWrap: true } });

        this.clipboardBg.setPosition(width - CLIPBOARD_WIDTH, 0);
        this.clipboardBg.height = height;
        this.clipboardTitle.setPosition(width - CLIPBOARD_WIDTH + 8, 8);
        this.clipboardCredits.setPosition(width - CLIPBOARD_WIDTH + 8, 30);

        const hudY = height - HUD_HEIGHT;
        this.hudBg.setPosition(0, hudY);
        this.hudBg.width = width;

        this.hudTowers.setPosition(SIDEBAR_WIDTH + 8, hudY + 7);
        this.hudKills.setPosition(SIDEBAR_WIDTH + 140, hudY + 7);
        this.hudMode.setPosition(width / 2, hudY + 7);
        this.hudTime.setPosition(width - CLIPBOARD_WIDTH - 8, hudY + 7);

        this.gameOverOverlay.width = width;
        this.gameOverOverlay.height = height;
        this.gameOverTitle.setPosition(width / 2, height / 2 - 60);
        this.gameOverScore.setPosition(width / 2, height / 2 + 10);
        this.gameOverHint.setPosition(width / 2, height / 2 + 60);

        this.updateCursorPosition();
    }
	
	// Main update loop. Coordinates system updates and UI refreshes.
    // delta: time in ms since last frame; _time: total elapsed game time.
    update(_time: number, delta: number) {
        if (this.gameState.isGameOver) return;

        const cam = this.cameras.main;
        this.gameState.update(delta);
        this.enemySystem.update(delta, cam.scrollX, cam.scrollY, cam.width, cam.height);
        this.towerSystem.update(delta);
        this.combatSystem.update(delta, this.enemySystem.activeEnemies);
        this.wallSystem.checkCollisions(this.enemySystem.activeEnemies, this.engine);

        this.updateHUD();
        this.updateGutterLineNumbers();
        this.updateClipboardUI();
    }

    private renderAllLines(): void {
        for (const [r, t] of this.rowTexts) {
            if (r >= this.engine.lines.length) { t.destroy(); this.rowTexts.delete(r); }
        }
        for (let r = 0; r < this.engine.lines.length; r++) this.renderRow(r);
    }

    private renderRow(r: number): void {
        const line = this.engine.lines[r] ?? '';
        let t = this.rowTexts.get(r);
        if (!t) {
            t = this.add.text(this.gameAreaStartX, r * FONT_HEIGHT, line, {
                fontFamily: 'monospace', fontSize: `${FONT_HEIGHT}px`, color: '#d4d4d4', resolution: 2,
            }).setOrigin(0, 0);
            this.rowTexts.set(r, t);
        } else if (t.text !== line) {
            t.setText(line);
        }
    }

    private updateCursorPosition(): void {
        this.cursorRect.x = this.gameAreaStartX + this.engine.cursorCol * this.fontWidth;
        this.cursorRect.y = this.engine.cursorRow * FONT_HEIGHT;
        if (this.engine.mode === 'VISUAL' && this.engine.visualStart) {
            const sr = Math.min(this.engine.visualStart.row, this.engine.cursorRow);
            const er = Math.max(this.engine.visualStart.row, this.engine.cursorRow);
            const sc = Math.min(this.engine.visualStart.col, this.engine.cursorCol);
            const ec = Math.max(this.engine.visualStart.col, this.engine.cursorCol);
            this.visualRect.x = this.gameAreaStartX + sc * this.fontWidth;
            this.visualRect.y = sr * FONT_HEIGHT;
            this.visualRect.width = (ec - sc + 1) * this.fontWidth;
            this.visualRect.height = (er - sr + 1) * FONT_HEIGHT;
            this.visualRect.setVisible(true);
        } else {
            this.visualRect.setVisible(false);
        }
        const cam = this.cameras.main;
        const visRows = Math.floor(cam.height / FONT_HEIGHT);
        const visCols = Math.floor((cam.width - this.gameAreaStartX - CLIPBOARD_WIDTH) / this.fontWidth);
        if (this.engine.cursorRow < this.firstVisibleRow + SCROLLOFF_ROWS)
            this.firstVisibleRow = Math.max(0, this.engine.cursorRow - SCROLLOFF_ROWS);
        if (this.engine.cursorRow > this.firstVisibleRow + visRows - SCROLLOFF_ROWS - 1)
            this.firstVisibleRow = Math.max(0, this.engine.cursorRow - visRows + SCROLLOFF_ROWS + 1);
        if (this.engine.cursorCol < this.firstVisibleCol + SCROLLOFF_COLS)
            this.firstVisibleCol = Math.max(0, this.engine.cursorCol - SCROLLOFF_COLS);
        if (this.engine.cursorCol > this.firstVisibleCol + visCols - SCROLLOFF_COLS - 1)
            this.firstVisibleCol = Math.max(0, this.engine.cursorCol - visCols + SCROLLOFF_COLS + 1);
        cam.setScroll(this.firstVisibleCol * this.fontWidth, this.firstVisibleRow * FONT_HEIGHT);
    }

    private updateGutterLineNumbers(): void {
        for (let i = 0; i < this.lineNumbers.length; i++) {
            const row = this.firstVisibleRow + i;
            const display = row < 0 ? '' : row === this.engine.cursorRow
                ? row.toString()
                : Math.abs(row - this.engine.cursorRow).toString();
            this.lineNumbers[i].setText(display);
            this.lineNumbers[i].y = row * FONT_HEIGHT;
        }
    }

    private updateHUD(): void {
        this.hudTowers.setText(`🏰 ${this.towerSystem.activeTowers.length}`);
        this.hudKills.setText(`Kills: ${this.gameState.kills}`);
        this.clipboardCredits.setText(`Credits: ${this.gameState.credits}`);
        this.hudTime.setText(`⏱ ${this.gameState.getTimeString()}`);
    }

    private showGameOver(): void {
        this.gameOverScore.setText(`Final Kills: ${this.gameState.kills}`);
        this.gameOverOverlay.setVisible(true);
        this.gameOverTitle.setVisible(true);
        this.gameOverScore.setVisible(true);
        this.gameOverHint.setVisible(true);
    }

    private updateClipboardUI(): void {
        const cam = this.cameras.main;
        const clipX = cam.width - CLIPBOARD_WIDTH;
        for (const t of this.clipboardEntries) t.destroy();
        this.clipboardEntries = [];
        const entries = this.towerSystem.clipboard.getClipboard();
        let y = 60;
        if (entries.length === 0) {
            const t = this.add.text(clipX + 8, y, 'No towers copied.\nDefeat enemies to\nunlock paste.', {
                fontFamily: 'monospace', fontSize: '12px', color: '#666',
            }).setOrigin(0, 0).setScrollFactor(0).setDepth(42);
            this.clipboardEntries.push(t);
        } else {
            for (let i = 0; i < entries.length; i++) {
                const e = entries[i];
                const cost = this.towerSystem.clipboard.getEntryCost(e);
                const stat = cost > 0 ? ` [Cost: ${cost}]` : '';
                const label = `[${i + 1}p] ${e.towerType.name}${stat}\n${e.towerType.pattern.join('\n')}`;
                const t = this.add.text(clipX + 8, y, label, {
                    fontFamily: 'monospace', fontSize: '13px', color: '#d4d4d4',
                }).setOrigin(0, 0).setScrollFactor(0).setDepth(42);
                this.clipboardEntries.push(t);
                y += 28 + e.towerType.pattern.length * 16;
            }
        }
    }

    private buildInstructionText(): string {
        return [
            'VIM TOWER DEFENSE',
            '==================',
            '',
            '── MOVEMENT ──',
            'h/j/k/l  ← ↓ ↑ →',
            'w / b    next/prev word',
            '5j       move 5 down',
            'e        end of word',
            '',
            '── INSERT MODE ──',
            'Esc return to normal',
            'i   insert before cursor',
            'a   insert after cursor',
            'I   insert at line start',
            'A   insert at line end',
            '',
            '── WALLS ──',
            'Any char typed in INSERT',
            'mode becomes a 1-HP WALL.',
            '',
            'If an enemy hits a wall,',
            'both are destroyed.',
            '',
            'Enemies ignore walls',
            'when pathfinding.',
            '',
            '── TOWERS ──',
            'Pre-placed ASCII shapes.',
            'Towers auto-fire at the',
            'nearest enemy in range.',
            '',
            'HP bar is shown below',
            'each tower. Enemies rush',
            'toward towers and attack',
            'on contact.',
            '',
            'Overwriting tower cells',
            'destroys the tower.',
            '',
            '── CLIPBOARD ──',
            'After enough kills, you',
            'can paste extra towers.',
            '',
            '1p / 2p  paste tower 1/2',
            'v        visual select',
            'y        yank selection',
            'yy       yank whole line',
            '3p - 9p  paste selection 3-9',
            'Kill progress shown in',
            'the CLIPBOARD panel →',
            '',
            '── GOAL ──',
            'Survive. Game ends',
            'when all towers fall.',
        ].join('\n');
    }
}
