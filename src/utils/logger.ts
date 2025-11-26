import pino from 'pino';
import { config } from '../config';

const logger = pino({
  level: config.logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  base: undefined, // avoid adding pid/hostname for cleaner logs
});

export default logger;
