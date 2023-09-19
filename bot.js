const mineflayer = require('mineflayer');
const {
	Movements, pathfinder,
	goals: { GoalBlock, GoalXZ }
} = require('mineflayer-pathfinder');

const config = require('./settings.json');

const loggers = require('./logging.js');
const logger = loggers.logger;

function createBot() {
	/** @type {import('./index').Bot} (bot.registry IS minecraft-data) */
	const bot = mineflayer.createBot({
		username: config['bot-account'].username,
		password: config['bot-account'].password ?? null,
		host: config.server.ip,
		port: config.server.port,
		version: config.server.version,
		colorsEnabled: false
	});
	bot.once('spawn', () => {
		bot.loadPlugin(pathfinder);
		const defaultMove = new Movements(bot);
		bot.pathfinder.setMovements(defaultMove);
		logger.info('Bot joined to the server');
		if (config.utils['auto-auth'].enabled) {
			logger.info('Started auto-auth module');
			let password = config.utils['auto-auth'].password;
			setTimeout(() => {
				bot.chat(`/register ${password} ${password}`);
				bot.chat(`/login ${password}`);
			}, 500);
			logger.info(`Authentication commands executed`);
		}
		if (config.utils['chat-messages'].enabled) {
			logger.info('Started chat-messages module');
			let messages = config.utils['chat-messages'].messages;
			if (config.utils['chat-messages'].repeat) {
				let delay = config.utils['chat-messages']['repeat-delay'];
				let i = 0;
				setInterval(() => {
					bot.chat(`${messages[i]}`);
					if (i + 1 === messages.length) i = 0;
					else i++;
				}, delay * 1000);
			} else messages.forEach(msg => bot.chat(msg));
		}
		const pos = config.position;
		if (config.position.enabled) {
			logger.info(
				`Starting moving to target location (${pos.x}, ${pos.y}, ${pos.z})`
			);
			bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z));
		}
		if (config.utils['anti-afk'].enabled) {
			if (config.utils['anti-afk'].sneak) bot.setControlState('sneak', true);
			if (config.utils['anti-afk'].jump) bot.setControlState('jump', true);
			if (config.utils['anti-afk'].hit.enabled) {
				let delay = config.utils['anti-afk'].hit.delay;
				let attackMobs = config.utils['anti-afk'].hit['attack-mobs']

				setInterval(() => {
					if (attackMobs) {
						const excludedTypes = ['object', 'player', 'global', 'orb', 'other'];
						let entity = bot.nearestEntity(e => !excludedTypes.includes(e.type));
						if (entity) {
							bot.attack(entity);
							return
						}
					}
					bot.swingArm('right', true);
				}, delay);
			}
			if (config.utils['anti-afk'].rotate) {
				setInterval(() => {
					bot.look(bot.entity.yaw + 1, bot.entity.pitch, true);
				}, 100);
			}
			if (config.utils['anti-afk']['circle-walk'].enabled) {
				let radius = config.utils['anti-afk']['circle-walk'].radius;
				circleWalk(bot, radius);
			}
		}
		bot.on('death', () => {
			logger.warn(`Bot has been died and was respawned at ${bot.entity.position}`);
		}).on('kicked', reason => {
			let reasonText = JSON.parse(reason).text;
			if (reasonText === '') reasonText = JSON.parse(reason).extra[0].text
			reasonText = reasonText.replace(/§./g, '');
			logger.warn(`Bot was kicked from the server. Reason: ${reasonText}`)
		}).on('error', err => logger.error(`${err.message}`));
	
		// check config before adding event listeners - every bit helps
		if (config.position.enabled) {
			bot.on('goal_reached', () => logger.info(`Bot arrived to target location. ${bot.entity.position}`));
		}
		if (config.utils['auto-reconnect']) {
			bot.on('end', () => {
				setTimeout(() => {
					createBot();
				}, config.utils['auto-reconnect-delay']);
			});
		}
		if (config.utils['chat-log']) bot.on('chat', (username, message) => logger.info(`<${username}> ${message}`))
	})
}
				
function circleWalk(bot, radius) {
	// walk in a circle around the bot's initial position
	return new Promise(() => {
		const pos = bot.entity.position;
		const x = pos.x;
		const y = pos.y;
		const z = pos.z;
		
		const points = [
			[x + radius, y, z],
			[x, y, z + radius],
			[x - radius, y, z],
			[x, y, z - radius],
		];
		
		let i = 0;
		setInterval(() => {
			if(i === points.length) i = 0;
			bot.pathfinder.setGoal(new GoalXZ(points[i][0], points[i][2]));
			i++;
		}, 1000);
	});
}

createBot();
