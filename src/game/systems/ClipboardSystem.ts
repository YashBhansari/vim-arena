import { TowerType, TOWER_TYPES } from '../entities/TowerTypes';
import { GameState } from '../GameState';

export interface ClipboardEntry {
    towerType: TowerType;
    position: { row: number, col: number };
    pattern: string[];
    baseKillsRequired: number;
}

export class ClipboardSystem {
    private clipboard: ClipboardEntry[] = [];

    constructor(private gameState: GameState) {
        const sniper = TOWER_TYPES['sniper'];
        if (sniper) {
            this.clipboard.push({
                towerType: sniper,
                position: { row: 0, col: 0 },
                pattern: [...sniper.pattern],
                baseKillsRequired: 25
            });
        }
        const rapid = TOWER_TYPES['rapid'];
        if (rapid) {
            this.clipboard.push({
                towerType: rapid,
                position: { row: 0, col: 0 },
                pattern: [...rapid.pattern],
                baseKillsRequired: 40
            });
        }
    }

    public getEntryCost(entry: ClipboardEntry): number {
        if (entry.baseKillsRequired === 0) return 0;
        const timePenalty = Math.floor(this.gameState.elapsedSeconds / 60) * 10;
        return entry.baseKillsRequired + timePenalty;
    }

    public yankPattern(pattern: string[]): boolean {
        const knownTower = Object.values(TOWER_TYPES).find(t =>
            t.pattern.length === pattern.length && t.pattern.every((line, i) => line === pattern[i])
        );
        let towerType: TowerType;
        if (knownTower) {
            towerType = knownTower;
        } else {
            towerType = {
                char: 'W',
                name: 'Custom Structure',
                maxHp: 1,
                damage: 0,
                range: 0,
                fireRate: 0,
                projectileSpeed: 0,
                color: 0x888888,
                scoreValue: 0,
                pattern: pattern,
                isWall: true
            };
        }
        this.clipboard.splice(2, 0, {
            towerType,
            position: { row: 0, col: 0 },
            pattern: pattern,
            baseKillsRequired: 20
        });
        if (this.clipboard.length > 9) {
            this.clipboard.splice(9);
        }
        return true;
    }

    public canPaste(index: number): boolean {
        const entry = this.clipboard[index];
        return entry ? this.gameState.credits >= this.getEntryCost(entry) : false;
    }

    public useEntry(index: number): boolean {
        const entry = this.clipboard[index];
        if (entry) {
            const cost = this.getEntryCost(entry);
            return this.gameState.spendCredits(cost);
        }
        return false;
    }

    public getClipboard(): ClipboardEntry[] {
        return [...this.clipboard];
    }
}
