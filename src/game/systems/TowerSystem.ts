import { Scene } from 'phaser';
import { Tower } from '../entities/Tower';
import { TOWER_TYPES, TowerType } from '../entities/TowerTypes';
import { VimEngine } from '../vim/VimEngine';
import { ClipboardSystem } from './ClipboardSystem';
import { GameState } from '../GameState';

const INITIAL_TOWERS: Array<{ row: number; col: number; type: string }> = [
    { row: 15, col: 22, type: 'sniper' },
    { row: 15, col: 42, type: 'rapid' },
];

export class TowerSystem {
    private readonly scene: Scene;
    private readonly vim: VimEngine;
    private readonly gameState: GameState;
    private readonly gutterWidth: number;
    private readonly fontWidth: number;
    private readonly fontHeight: number;
    private readonly clipboardSystem: ClipboardSystem;
	
    private towers: Map<string, Tower> = new Map();
    private towerPatterns: Map<string, { type: string; startCol: number; startRow: number }> = new Map();
    private cellToTower: Map<string, string> = new Map();

    public towerCells: Set<string> = new Set();
    public onTowerDestroyed?: (col: number, row: number) => void;

    constructor(
        scene: Scene,
        vim: VimEngine,
        gutterWidth: number,
        fontWidth: number,
        fontHeight: number,
        gameState: GameState,
    ) {
        this.scene = scene;
        this.vim = vim;
        this.gameState = gameState;
        this.gutterWidth = gutterWidth;
        this.fontWidth = fontWidth;
        this.fontHeight = fontHeight;
        this.clipboardSystem = new ClipboardSystem(gameState);

        this.vim.onPaste = (row, col, index) => this.handlePaste(row, col, index);
        this.vim.onYank = (pattern) => { this.clipboardSystem.yankPattern(pattern); };

        this.placeInitialTowers();
    }

    get activeTowers(): Tower[] {
        return Array.from(this.towers.values()).filter(t => !t.isDead);
    }

    get clipboard(): ClipboardSystem {
        return this.clipboardSystem;
    }

    public getTowerAt(col: number, row: number): Tower | undefined {
        const towerKey = this.cellToTower.get(`${col},${row}`);
        return towerKey ? this.towers.get(towerKey) : undefined;
    }

    update(delta: number): void {
        for (const t of this.towers.values()) t.tickCooldown(delta);
    }

    towerTakeDamage(tower: Tower, amount: number, eraseBuffer: boolean = true): void {
        const died = tower.takeDamage(amount);
        if (died) {
            this.eraseTowerFromBuffer(tower, eraseBuffer);
            this.towers.delete(this.keyFor(tower));
            tower.destroy();
            this.gameState.setTowerCount(this.activeTowers.length);
            this.onTowerDestroyed?.(tower.col, tower.row);
        }
    }

    destroy(): void {
        for (const t of this.towers.values()) t.destroy();
        this.towers.clear();
        this.towerCells.clear();
        this.cellToTower.clear();
    }

    private placeInitialTowers(): void {
        for (const init of INITIAL_TOWERS) {
            const type = TOWER_TYPES[init.type];
            if (type) this.writeAndRegisterTower(init.col, init.row, init.type, type);
        }
        this.gameState.setTowerCount(this.activeTowers.length);
    }

    private handlePaste(row: number, col: number, index: number): void {
        const clipboard = this.clipboardSystem.getClipboard();
        const entryIndex = Math.min(index, clipboard.length - 1);
        const entry = clipboard[entryIndex];
        if (!entry || !this.clipboardSystem.canPaste(entryIndex)) return;

        const type = entry.towerType;

        if (type.isWall) {
            this.writeOnlyToBuffer(col, row, type);
        } else {
            let typeKey = Object.keys(TOWER_TYPES).find(k => TOWER_TYPES[k].name === type.name);
            if (!typeKey) {
                typeKey = 'wall_' + Math.random().toString(36).slice(2, 9);
                TOWER_TYPES[typeKey] = type;
            }
            this.writeAndRegisterTower(col, row, typeKey, type);
        }

        this.clipboardSystem.useEntry(entryIndex);
        this.vim.onRenderAll?.();
        this.gameState.setTowerCount(this.activeTowers.length);
    }

    private writeOnlyToBuffer(startCol: number, startRow: number, type: TowerType): void {
        for (let i = 0; i < type.pattern.length; i++) {
            const lineIdx = startRow + i;
            while (this.vim.lines.length <= lineIdx) this.vim.lines.push('');
            const patLine = type.pattern[i];
            const existing = this.vim.lines[lineIdx].padEnd(startCol + patLine.length, ' ');
            this.vim.lines[lineIdx] = existing.slice(0, startCol) + patLine + existing.slice(startCol + patLine.length);
        }
    }

    private writeAndRegisterTower(startCol: number, startRow: number, typeKey: string, type: TowerType): void {
        const key = `${startCol},${startRow}`;

        for (let i = 0; i < type.pattern.length; i++) {
            const lineIdx = startRow + i;
            while (this.vim.lines.length <= lineIdx) this.vim.lines.push('');
            const patLine = type.pattern[i];
            const existing = this.vim.lines[lineIdx].padEnd(startCol + patLine.length, ' ');
            this.vim.lines[lineIdx] = existing.slice(0, startCol) + patLine + existing.slice(startCol + patLine.length);

            for (let c = 0; c < patLine.length; c++) {
                if (patLine[c] !== ' ') {
                    const cellKey = `${startCol + c},${lineIdx}`;
                    this.towerCells.add(cellKey);
                    this.cellToTower.set(cellKey, key);
                }
            }
        }

        const centerCol = startCol + Math.floor(type.pattern[0].length / 2);
        const centerRow = startRow + Math.floor(type.pattern.length / 2);
        const wx = this.gutterWidth + centerCol * this.fontWidth + this.fontWidth / 2;
        const wy = centerRow * this.fontHeight + this.fontHeight / 2;
        const patW = this.fontWidth * type.pattern[0].length;
        const patH = this.fontHeight * type.pattern.length;

        const tower = new Tower(this.scene, centerCol, centerRow, wx, wy, type, patW, patH);
        this.towers.set(key, tower);
        this.towerPatterns.set(key, { type: typeKey, startCol, startRow });
    }

    private keyFor(tower: Tower): string {
        for (const [k, t] of this.towers) if (t === tower) return k;
        return '';
    }

    private eraseTowerFromBuffer(tower: Tower, eraseBuffer: boolean): void {
        const key = this.keyFor(tower);
        const pat = this.towerPatterns.get(key);
        if (!pat) return;
        const type = TOWER_TYPES[pat.type];
        if (!type) return;
        for (let i = 0; i < type.pattern.length; i++) {
            const lineIdx = pat.startRow + i;
            if (lineIdx >= this.vim.lines.length) continue;
            const patLine = type.pattern[i];

            if (eraseBuffer) {
                const line = this.vim.lines[lineIdx];
                this.vim.lines[lineIdx] =
                    line.slice(0, pat.startCol) +
                    ' '.repeat(patLine.length) +
                    line.slice(pat.startCol + patLine.length);
                this.vim.onRenderRow?.(lineIdx);
            }

            for (let c = 0; c < patLine.length; c++) {
                const cellKey = `${pat.startCol + c},${lineIdx}`;
                this.towerCells.delete(cellKey);
                this.cellToTower.delete(cellKey);
            }
        }
        this.towerPatterns.delete(key);
    }
}
