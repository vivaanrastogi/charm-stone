require('dotenv').config();

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

app.get('/', (req, res) => {
  res.send('Charm Stone Shop API Running');
});

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *',
      [username, hash]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ message: 'Wrong password' });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/sales', auth, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM sales ORDER BY created_at DESC'
  );

  res.json(result.rows);
});

app.post('/sales', auth, async (req, res) => {
  const {
    item_name,
    category,
    amount,
    payment_method,
    notes
  } = req.body;

  const result = await pool.query(
    `INSERT INTO sales
    (item_name, category, amount, payment_method, notes)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *`,
    [
      item_name,
      category,
      amount,
      payment_method,
      notes
    ]
  );

  res.json(result.rows[0]);
});

app.get('/analytics', auth, async (req, res) => {
  const total = await pool.query(
    'SELECT COALESCE(SUM(amount),0) as total FROM sales'
  );

  const count = await pool.query(
    'SELECT COUNT(*) FROM sales'
  );

  res.json({
    totalSales: total.rows[0].total,
    transactionCount: count.rows[0].count
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Running on ${PORT}`);
});
