// for proper bot.registry intellisense. might get fixed in future mineflayer versions
import mineflayer from 'mineflayer'
import MinecraftData from 'minecraft-data'
export interface Bot extends Omit<mineflayer.Bot, 'registry'> {
    registry: ReturnType<typeof MinecraftData>
}
