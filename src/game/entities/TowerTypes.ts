export interface TowerType {
    readonly char: string;
    readonly name: string;
    readonly maxHp: number;
    readonly damage: number;
    readonly range: number;
    readonly fireRate: number;
    readonly projectileSpeed: number;
    readonly color: number;
    readonly scoreValue: number;
    readonly pattern: string[];
    readonly isWall?: boolean;
}

export const TOWER_TYPES: Record<string, TowerType> = {
    'sniper': {
        char: '#',
        name: 'Sniper Tower',
        maxHp: 3,
        damage: 1,
        range: 400,
        fireRate: 0.5,
        projectileSpeed: 600,
        color: 0x00aaff,
        scoreValue: 10,
        pattern: [
            '  |  ',
            '  •  ',
            ' / \\ '
        ]
    },
    'rapid': {
        char: '@',
        name: 'Rapid Tower',
        maxHp: 3,
        damage: 1,
        range: 120,
        fireRate: 2.0,
        projectileSpeed: 400,
        color: 0xff8800,
        scoreValue: 10,
        pattern: [
            ' / \\ ',
            '  •  ',
            ' \\ / '
        ]
    }
};

export function getTowerType(char: string): TowerType | null {
    return TOWER_TYPES[char] ?? null;
}

export function getTowerTypeByName(name: string): TowerType | null {
    return Object.values(TOWER_TYPES).find(type => type.name === name) ?? null;
}
