import { Router, Request, Response } from 'express';
import { registerUser, loginUser, getUser } from '../services/userService.js';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }
  const result = await registerUser(username, password);
  if ('error' in result) { res.status(409).json({ error: result.error }); return; }
  res.status(201).json({ username: result.username });
});

router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }
  const result = await loginUser(username, password);
  if ('error' in result) { res.status(401).json({ error: result.error }); return; }
  res.json({ user: result.user });
});

router.get('/users/:username', async (req: Request, res: Response) => {
  const result = await getUser(req.params.username as string);
  if ('error' in result) { res.status(404).json({ error: result.error }); return; }
  res.json({ user: result.user });
});

export default router;
