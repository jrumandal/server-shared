import configuration from '../src/lib/config/configuration';

describe('configuration()', () => {
  const prev = {
    SERVICE_NAME: process.env.SERVICE_NAME,
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
  };

  const clear = () => {
    delete process.env.SERVICE_NAME;
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.DATABASE_URL;
  };

  const restore = () => {
    clear();
    if (prev.SERVICE_NAME !== undefined) process.env.SERVICE_NAME = prev.SERVICE_NAME;
    if (prev.PORT !== undefined) process.env.PORT = prev.PORT;
    if (prev.NODE_ENV !== undefined) process.env.NODE_ENV = prev.NODE_ENV;
    if (prev.DATABASE_URL !== undefined) process.env.DATABASE_URL = prev.DATABASE_URL;
  };

  afterEach(restore);

  it('returns defaults when env is unset', () => {
    clear();
    const cfg = configuration();
    expect(cfg.serviceName).toBe('service');
    expect(cfg.port).toBe(4001);
    expect(cfg.env).toBe('development');
    expect(cfg.databaseUrl).toBeUndefined();
  });

  it('reads values from the environment', () => {
    process.env.SERVICE_NAME = 'catalog-svc';
    process.env.PORT = '4001';
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

    const cfg = configuration();
    expect(cfg.serviceName).toBe('catalog-svc');
    expect(cfg.port).toBe(4001);
    expect(cfg.env).toBe('production');
    expect(cfg.databaseUrl).toBe('postgresql://user:pass@localhost:5432/db');
  });
});
