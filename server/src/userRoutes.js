import { Router } from 'express';
import { registerUser, loginUser, getUser } from './userService.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  const result = await registerUser(username, password);
  if (result.error) return res.status(409).json({ error: result.error });
  res.status(201).json({ username: result.username });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  const result = await loginUser(username, password);
  if (result.error) return res.status(401).json({ error: result.error });
  res.json({ user: result.user });
});

router.get('/users/:username', async (req, res) => {
  const result = await getUser(req.params.username);
  if (result.error) return res.status(404).json({ error: result.error });
  res.json({ user: result.user });
});

export default router;
