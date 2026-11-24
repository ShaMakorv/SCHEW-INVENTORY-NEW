import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import {
  createSeedCashflows,
  createSeedItems,
  createSeedStockTransactions,
  createSeedUsers,
  hashPasswordWithSalt,
  verifyPassword,
} from './src/data/seedData.ts';
import type {
  CashflowInput,
  CashflowTransaction,
  Item,
  ItemInput,
  StockTransaction,
  StockTransactionInput,
  StoredUser,
  UserAccount,
  UserRole,
} from './src/types/inventory.ts';
import {
  validateAndApplyStockTransaction,
  validateCashflowInput,
  validateItemInput,
} from './src/utils/inventoryLogic.ts';

interface DatabaseState {
  users: StoredUser[];
  items: Item[];
  stockTransactions: StockTransaction[];
  cashflows: CashflowTransaction[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'schew-db.json');
const SESSION_COOKIE = 'schew_session';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const PORT = Number(process.env.PORT) || 3000;

function createInitialDbState(): DatabaseState {
  return {
    users: createSeedUsers(),
    items: createSeedItems(),
    stockTransactions: createSeedStockTransactions(),
    cashflows: createSeedCashflows(),
  };
}

function loadDb(): DatabaseState {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const initial = createInitialDbState();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DatabaseState>;
    if (!parsed.users || !parsed.items || !parsed.stockTransactions || !parsed.cashflows) {
      throw new Error('Incomplete DB file');
    }
    return parsed as DatabaseState;
  } catch {
    const fallback = createInitialDbState();
    fs.writeFileSync(DB_PATH, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

let db: DatabaseState = loadDb();

function persistDb(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

function toSafeUser(user: StoredUser): UserAccount {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
  };
}

function signSessionToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, iat: Date.now() }),
    'utf-8',
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      uid?: string;
    };
    return parsed.uid ?? null;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = decodeURIComponent(part.slice(eqIdx + 1).trim());
    out[key] = val;
  }
  return out;
}

function isHttpsContext(req: Request): boolean {
  const xfProto = String(req.headers['x-forwarded-proto'] ?? '').toLowerCase();
  return (
    req.secure ||
    xfProto.includes('https') ||
    req.hostname === 'localhost' ||
    req.hostname === '127.0.0.1' ||
    req.hostname.endsWith('.run.app')
  );
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${60 * 60 * 24 * 7}`,
  ];
  if (isHttpsContext(req)) {
    parts.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(req: Request, res: Response): void {
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'Max-Age=0'];
  if (isHttpsContext(req)) {
    parts.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function extractSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE] ?? null;
}

interface AuthedRequest extends Request {
  currentUser?: StoredUser;
}

function verifyMutationHeader(req: Request, res: Response, next: NextFunction): void {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const xrw = req.headers['x-requested-with'];
    const origin = req.headers.origin;
    const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host;
    let originMatches = false;
    if (origin && host) {
      try {
        originMatches = new URL(origin).host === host;
      } catch {
        originMatches = false;
      }
    }
    if (xrw !== 'XMLHttpRequest' && !originMatches) {
      res.status(403).json({ error: 'Permintaan tidak valid (header keamanan tidak cocok).' });
      return;
    }
  }
  next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const rawToken = extractSessionToken(req);
  if (!rawToken) {
    res.status(401).json({ error: 'Sesi login tidak ditemukan. Silakan masuk kembali.' });
    return;
  }
  const userId = verifySessionToken(rawToken);
  if (!userId) {
    res.status(401).json({ error: 'Sesi login tidak valid atau kedaluwarsa.' });
    return;
  }
  const user = db.users.find((u) => u.id === userId && u.active);
  if (!user) {
    res.status(401).json({ error: 'Akun pengguna tidak aktif atau tidak ditemukan.' });
    return;
  }
  req.currentUser = user;
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.currentUser || req.currentUser.role !== 'admin') {
    res.status(403).json({ error: 'Akses ditolak. Fitur ini hanya tersedia untuk peran Admin.' });
    return;
  }
  next();
}

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', verifyMutationHeader);

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    if (!email || !password) {
      res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
      return;
    }
    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      res.status(401).json({ error: 'Email atau kata sandi salah.' });
      return;
    }
    if (!user.active) {
      res.status(403).json({ error: 'Akun Anda sedang dinonaktifkan oleh Admin.' });
      return;
    }
    const token = signSessionToken(user.id);
    setSessionCookie(req, res, token);
    res.json({ user: toSafeUser(user), token });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req: AuthedRequest, res: Response) => {
    const rawToken = extractSessionToken(req);
    if (!rawToken) {
      res.json({ user: null });
      return;
    }
    const userId = verifySessionToken(rawToken);
    if (!userId) {
      res.json({ user: null });
      return;
    }
    const user = db.users.find((u) => u.id === userId && u.active);
    res.json({ user: user ? toSafeUser(user) : null });
  });

  // Items
  app.get('/api/items', requireAuth, (_req: AuthedRequest, res: Response) => {
    res.json({ items: db.items });
  });

  app.post('/api/items', requireAuth, requireAdmin, (req: AuthedRequest, res: Response) => {
    const input: ItemInput = {
      sku: String(req.body?.sku ?? ''),
      name: String(req.body?.name ?? ''),
      category: String(req.body?.category ?? ''),
      unit: String(req.body?.unit ?? ''),
      buyPrice: Number(req.body?.buyPrice),
      sellPrice: Number(req.body?.sellPrice),
      currentStock: Number(req.body?.currentStock),
      minStock: Number(req.body?.minStock),
      status: req.body?.status === 'inactive' ? 'inactive' : 'active',
      notes: String(req.body?.notes ?? ''),
    };
    const validation = validateItemInput(input, db.items);
    if (!validation.valid) {
      res.status(400).json({ error: 'Validasi data barang gagal.', errors: validation.errors });
      return;
    }
    const newItem: Item = {
      id: `itm-${crypto.randomUUID().slice(0, 8)}`,
      sku: input.sku.trim().toUpperCase(),
      name: input.name.trim(),
      category: input.category.trim(),
      unit: input.unit.trim(),
      buyPrice: Math.round(input.buyPrice),
      sellPrice: Math.round(input.sellPrice),
      currentStock: Math.round(input.currentStock),
      minStock: Math.round(input.minStock),
      status: input.status,
      notes: input.notes.trim(),
      updatedAt: new Date().toISOString(),
    };
    db.items.unshift(newItem);
    persistDb();
    res.status(201).json({ item: newItem });
  });

  app.put('/api/items/:id', requireAuth, requireAdmin, (req: AuthedRequest, res: Response) => {
    const idx = db.items.findIndex((it) => it.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Barang tidak ditemukan.' });
      return;
    }
    const input: ItemInput = {
      sku: String(req.body?.sku ?? ''),
      name: String(req.body?.name ?? ''),
      category: String(req.body?.category ?? ''),
      unit: String(req.body?.unit ?? ''),
      buyPrice: Number(req.body?.buyPrice),
      sellPrice: Number(req.body?.sellPrice),
      currentStock: Number(req.body?.currentStock),
      minStock: Number(req.body?.minStock),
      status: req.body?.status === 'inactive' ? 'inactive' : 'active',
      notes: String(req.body?.notes ?? ''),
    };
    const validation = validateItemInput(input, db.items, req.params.id);
    if (!validation.valid) {
      res.status(400).json({ error: 'Validasi data barang gagal.', errors: validation.errors });
      return;
    }
    const updated: Item = {
      ...db.items[idx],
      sku: input.sku.trim().toUpperCase(),
      name: input.name.trim(),
      category: input.category.trim(),
      unit: input.unit.trim(),
      buyPrice: Math.round(input.buyPrice),
      sellPrice: Math.round(input.sellPrice),
      currentStock: Math.round(input.currentStock),
      minStock: Math.round(input.minStock),
      status: input.status,
      notes: input.notes.trim(),
      updatedAt: new Date().toISOString(),
    };
    db.items[idx] = updated;
    persistDb();
    res.json({ item: updated });
  });

  app.delete('/api/items/:id', requireAuth, requireAdmin, (req: AuthedRequest, res: Response) => {
    const idx = db.items.findIndex((it) => it.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Barang tidak ditemukan.' });
      return;
    }
    db.items.splice(idx, 1);
    persistDb();
    res.json({ ok: true });
  });

  // Stock Transactions
  app.get('/api/stock-transactions', requireAuth, (_req: AuthedRequest, res: Response) => {
    res.json({ transactions: db.stockTransactions });
  });

  app.post('/api/stock-transactions', requireAuth, (req: AuthedRequest, res: Response) => {
    const input: StockTransactionInput = {
      itemId: String(req.body?.itemId ?? ''),
      type: req.body?.type === 'out' ? 'out' : 'in',
      quantity: Number(req.body?.quantity),
      date: String(req.body?.date ?? ''),
      counterparty: String(req.body?.counterparty ?? ''),
      notes: String(req.body?.notes ?? ''),
    };
    const nowIso = new Date().toISOString();
    const txId = `STK-${nowIso.slice(0, 7).replace('-', '')}-${String(db.stockTransactions.length + 1).padStart(3, '0')}`;
    const result = validateAndApplyStockTransaction(
      db.items,
      input,
      req.currentUser!.name,
      nowIso,
      txId,
    );
    if (!result.ok || !result.updatedItem || !result.transaction) {
      res.status(400).json({
        error: Object.values(result.errors)[0] || 'Validasi mutasi stok gagal.',
        errors: result.errors,
      });
      return;
    }

    const itemIdx = db.items.findIndex((it) => it.id === result.updatedItem!.id);
    db.items[itemIdx] = result.updatedItem;
    db.stockTransactions.unshift(result.transaction);
    persistDb();

    res.status(201).json({
      transaction: result.transaction,
      item: result.updatedItem,
    });
  });

  // Cashflows
  app.get('/api/cashflows', requireAuth, (_req: AuthedRequest, res: Response) => {
    res.json({ cashflows: db.cashflows });
  });

  app.post('/api/cashflows', requireAuth, (req: AuthedRequest, res: Response) => {
    const input: CashflowInput = {
      type: req.body?.type === 'expense' ? 'expense' : 'income',
      category: String(req.body?.category ?? ''),
      amount: Number(req.body?.amount),
      date: String(req.body?.date ?? ''),
      stockRefId: req.body?.stockRefId ? String(req.body.stockRefId) : undefined,
      stockRefLabel: req.body?.stockRefLabel ? String(req.body.stockRefLabel) : undefined,
      description: String(req.body?.description ?? ''),
    };
    const validation = validateCashflowInput(input);
    if (!validation.valid) {
      res.status(400).json({ error: 'Validasi kas operasional gagal.', errors: validation.errors });
      return;
    }

    const nowIso = new Date().toISOString();
    const newCf: CashflowTransaction = {
      id: `KAS-${nowIso.slice(0, 7).replace('-', '')}-${String(db.cashflows.length + 1).padStart(3, '0')}`,
      type: input.type,
      category: input.category.trim(),
      amount: Math.round(input.amount),
      date: input.date,
      stockRefId: input.stockRefId,
      stockRefLabel: input.stockRefLabel,
      description: input.description.trim(),
      recordedBy: req.currentUser!.name,
      createdAt: nowIso,
    };
    db.cashflows.unshift(newCf);
    persistDb();
    res.status(201).json({ cashflow: newCf });
  });

  app.put('/api/cashflows/:id', requireAuth, requireAdmin, (req: AuthedRequest, res: Response) => {
    const idx = db.cashflows.findIndex((cf) => cf.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Transaksi kas tidak ditemukan.' });
      return;
    }
    const input: CashflowInput = {
      type: req.body?.type === 'expense' ? 'expense' : 'income',
      category: String(req.body?.category ?? ''),
      amount: Number(req.body?.amount),
      date: String(req.body?.date ?? ''),
      stockRefId: req.body?.stockRefId ? String(req.body.stockRefId) : undefined,
      stockRefLabel: req.body?.stockRefLabel ? String(req.body.stockRefLabel) : undefined,
      description: String(req.body?.description ?? ''),
    };
    const validation = validateCashflowInput(input);
    if (!validation.valid) {
      res.status(400).json({ error: 'Validasi kas operasional gagal.', errors: validation.errors });
      return;
    }
    const updated: CashflowTransaction = {
      ...db.cashflows[idx],
      type: input.type,
      category: input.category.trim(),
      amount: Math.round(input.amount),
      date: input.date,
      stockRefId: input.stockRefId,
      stockRefLabel: input.stockRefLabel,
      description: input.description.trim(),
    };
    db.cashflows[idx] = updated;
    persistDb();
    res.json({ cashflow: updated });
  });

  app.delete('/api/cashflows/:id', requireAuth, requireAdmin, (req: AuthedRequest, res: Response) => {
    const idx = db.cashflows.findIndex((cf) => cf.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Transaksi kas tidak ditemukan.' });
      return;
    }
    db.cashflows.splice(idx, 1);
    persistDb();
    res.json({ ok: true });
  });

  // Users (Admin only)
  app.get('/api/users', requireAuth, requireAdmin, (_req: AuthedRequest, res: Response) => {
    res.json({ users: db.users.map(toSafeUser) });
  });

  app.post('/api/users', requireAuth, requireAdmin, (req: AuthedRequest, res: Response) => {
    const name = String(req.body?.name ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const role: UserRole = req.body?.role === 'admin' ? 'admin' : 'staff';
    const active = req.body?.active !== false;

    const errors: Record<string, string> = {};
    if (!name) errors.name = 'Nama pengguna wajib diisi.';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Format email tidak valid.';
    } else if (db.users.some((u) => u.email.toLowerCase() === email)) {
      errors.email = 'Email sudah terdaftar.';
    }
    if (password.length < 6) {
      errors.password = 'Kata sandi minimal 6 karakter.';
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: 'Validasi data pengguna gagal.', errors });
      return;
    }

    const { hash, salt } = hashPasswordWithSalt(password);
    const created: StoredUser = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      name,
      email,
      role,
      active,
      createdAt: new Date().toISOString(),
      passwordHash: hash,
      passwordSalt: salt,
    };
    db.users.push(created);
    persistDb();
    res.status(201).json({ user: toSafeUser(created) });
  });

  app.put('/api/users/:id', requireAuth, requireAdmin, (req: AuthedRequest, res: Response) => {
    const idx = db.users.findIndex((u) => u.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
      return;
    }
    const target = db.users[idx];
    const name = String(req.body?.name ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const role: UserRole = req.body?.role === 'admin' ? 'admin' : 'staff';
    const active = Boolean(req.body?.active);

    if (target.id === req.currentUser!.id && (!active || role !== 'admin')) {
      res.status(400).json({
        error: 'Anda tidak dapat menonaktifkan atau menurunkan peran akun yang sedang digunakan.',
      });
      return;
    }

    const errors: Record<string, string> = {};
    if (!name) errors.name = 'Nama pengguna wajib diisi.';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Format email tidak valid.';
    } else if (db.users.some((u) => u.email.toLowerCase() === email && u.id !== target.id)) {
      errors.email = 'Email sudah digunakan pengguna lain.';
    }
    if (password && password.length < 6) {
      errors.password = 'Kata sandi baru minimal 6 karakter.';
    }
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: 'Validasi pengguna gagal.', errors });
      return;
    }

    let passwordHash = target.passwordHash;
    let passwordSalt = target.passwordSalt;
    if (password) {
      const cred = hashPasswordWithSalt(password);
      passwordHash = cred.hash;
      passwordSalt = cred.salt;
    }

    const updated: StoredUser = {
      ...target,
      name,
      email,
      role,
      active,
      passwordHash,
      passwordSalt,
    };
    db.users[idx] = updated;
    persistDb();
    res.json({ user: toSafeUser(updated) });
  });

  app.post('/api/admin/reset-demo', requireAuth, requireAdmin, (_req: AuthedRequest, res: Response) => {
    db = createInitialDbState();
    persistDb();
    res.json({
      items: db.items,
      stockTransactions: db.stockTransactions,
      cashflows: db.cashflows,
      users: db.users.map(toSafeUser),
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SCHEW Inventory server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
