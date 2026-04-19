export class GameState {
    public kills: number = 0;
    public credits: number = 0;
    public elapsedSeconds: number = 0;
    public isGameOver: boolean = false;
    public towerCount: number = 0;
    public onKillsChange?: (kills: number) => void;
    public onCreditsChange?: (credits: number) => void;
    public onGameOver?: () => void;
    public onTowerCountChange?: (count: number) => void;

    constructor() {}

    get difficulty(): number {
        return 1 + Math.sqrt(this.elapsedSeconds / 10) + (this.kills / 15);
    }

    get difficultyLabel(): string {
        const d = this.difficulty;
        if (d < 1.5) return 'EASY';
        if (d < 2.5) return 'MEDIUM';
        if (d < 4.0) return 'HARD';
        return 'INSANE';
    }

    update(delta: number): void {
        if (this.isGameOver) return;
        this.elapsedSeconds += delta / 1000;
    }

    setTowerCount(count: number): void {
        this.towerCount = count;
        this.onTowerCountChange?.(count);
        if (count === 0) {
            this.isGameOver = true;
            this.onGameOver?.();
        }
    }

    addKill(): void {
        this.kills += 1;
        this.credits += 1;
        this.onKillsChange?.(this.kills);
        this.onCreditsChange?.(this.credits);
    }

    spendCredits(amount: number): boolean {
        if (this.credits >= amount) {
            this.credits -= amount;
            this.onCreditsChange?.(this.credits);
            return true;
        }
        return false;
    }

    getTimeString(): string {
        const m = Math.floor(this.elapsedSeconds / 60);
        const s = Math.floor(this.elapsedSeconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}
