import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LOG_LEVEL_KEY, getStoredLogLevel, logger, storeLogLevel } from '@/lib/logger';

describe('logger', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to info when storage is empty', () => {
    expect(getStoredLogLevel()).toBe('info');
  });

  it('falls back to info for invalid stored level', () => {
    localStorage.setItem(LOG_LEVEL_KEY, 'invalid');
    expect(getStoredLogLevel()).toBe('info');
  });

  it('persists and reads selected log level', () => {
    storeLogLevel('warn');
    expect(getStoredLogLevel()).toBe('warn');
  });

  it('filters debug/info when level is warn', () => {
    storeLogLevel('warn');
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.debug('hidden debug');
    logger.info('hidden info');
    logger.warn('visible warn');
    logger.error('visible error');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    debugSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
