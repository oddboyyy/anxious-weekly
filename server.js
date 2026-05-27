const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const db = new sqlite3.Database('./anxious.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

function initDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS thoughts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      time TEXT NOT NULL,
      likes INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thought_id INTEGER,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      time TEXT NOT NULL,
      FOREIGN KEY (thought_id) REFERENCES thoughts(id)
    )
  `);

  insertMockData();
}

function insertMockData() {
  db.get('SELECT COUNT(*) as count FROM thoughts', (err, row) => {
    if (err) {
      console.error(err);
      return;
    }

    if (row.count === 0) {
      const mockThoughts = [
        { author: '小林', content: '今天尝试了冥想，虽然一开始很难静下心来，但坚持了10分钟后，感觉整个人都放松了很多。有时候，我们需要的只是给自己一点安静的时间。', time: '2024-01-15 14:30', likes: 23 },
        { author: '阿月', content: '最近工作压力好大，感觉每天都在被推着走。但今天早上看到窗外的阳光，突然觉得，其实生活中还是有很多美好的瞬间值得我们去发现。', time: '2024-01-15 11:20', likes: 45 },
        { author: '大雄', content: '今天和朋友聊了很久，发现每个人都有自己的焦虑和烦恼。原来我不是一个人在战斗，这种感觉真好。', time: '2024-01-14 20:15', likes: 67 },
        { author: '思思', content: '给自己定了一个小目标：每天记录三件开心的小事。坚持了一个星期，发现生活中的小确幸真的很多。', time: '2024-01-14 09:00', likes: 89 },
        { author: '小宇', content: '焦虑的时候，我喜欢去公园散步。看看花草树木，听听鸟叫，心情会平静很多。大自然真的是最好的疗愈师。', time: '2024-01-13 16:45', likes: 56 }
      ];

      const thoughtStmt = db.prepare('INSERT INTO thoughts (author, content, time, likes) VALUES (?, ?, ?, ?)');
      mockThoughts.forEach((thought, index) => {
        thoughtStmt.run(thought.author, thought.content, thought.time, thought.likes, function() {
          const thoughtId = this.lastID;
          insertMockComments(thoughtId, index);
        });
      });
      thoughtStmt.finalize();
    }
  });
}

function insertMockComments(thoughtId, index) {
  const mockComments = [
    [
      { author: '小雨', content: '我也想试试冥想，但总是坚持不下来，有什么好的方法吗？', time: '2024-01-15 15:00' },
      { author: '阿杰', content: '推荐用潮汐APP，里面的白噪音很适合冥想', time: '2024-01-15 15:30' }
    ],
    [
      { author: '小风', content: '同感！有时候停下来看看周围，会发现很多被忽略的美好', time: '2024-01-15 12:00' }
    ],
    [
      { author: '小美', content: '是的，分享本身就是一种治愈', time: '2024-01-14 21:00' },
      { author: '老王', content: '深有体会，多和朋友交流真的很重要', time: '2024-01-14 21:30' },
      { author: '小红', content: '下次我也想加入你们的聊天', time: '2024-01-14 22:00' }
    ],
    [
      { author: '阿华', content: '这个方法真好！我也要试试', time: '2024-01-14 10:00' },
      { author: '小敏', content: '坚持下去，会有惊喜的', time: '2024-01-14 10:30' }
    ],
    []
  ];

  if (mockComments[index].length > 0) {
    const commentStmt = db.prepare('INSERT INTO comments (thought_id, author, content, time) VALUES (?, ?, ?, ?)');
    mockComments[index].forEach(comment => {
      commentStmt.run(thoughtId, comment.author, comment.content, comment.time);
    });
    commentStmt.finalize();
  }
}

app.get('/api/thoughts', (req, res) => {
  db.all('SELECT * FROM thoughts ORDER BY id DESC', (err, thoughts) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const thoughtsWithComments = [];
    let completed = 0;

    if (thoughts.length === 0) {
      res.json([]);
      return;
    }

    thoughts.forEach(thought => {
      db.all('SELECT * FROM comments WHERE thought_id = ? ORDER BY id ASC', [thought.id], (err, comments) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        thoughtsWithComments.push({
          ...thought,
          comments: comments
        });

        completed++;
        if (completed === thoughts.length) {
          res.json(thoughtsWithComments);
        }
      });
    });
  });
});

app.post('/api/thoughts', (req, res) => {
  const { author, content } = req.body;
  
  if (!author || !content) {
    res.status(400).json({ error: 'Author and content are required' });
    return;
  }

  const time = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/\//g, '-');

  db.run('INSERT INTO thoughts (author, content, time, likes) VALUES (?, ?, ?, ?)', 
    [author, content, time, 0],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      res.json({
        id: this.lastID,
        author,
        content,
        time,
        likes: 0,
        comments: []
      });
    }
  );
});

app.post('/api/thoughts/:id/like', (req, res) => {
  const { id } = req.params;

  db.run('UPDATE thoughts SET likes = likes + 1 WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (this.changes === 0) {
      res.status(404).json({ error: 'Thought not found' });
      return;
    }

    db.get('SELECT likes FROM thoughts WHERE id = ?', [id], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      res.json({ likes: row.likes });
    });
  });
});

app.post('/api/thoughts/:id/comments', (req, res) => {
  const { id } = req.params;
  const { author, content } = req.body;

  if (!author || !content) {
    res.status(400).json({ error: 'Author and content are required' });
    return;
  }

  const time = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/\//g, '-');

  db.run('INSERT INTO comments (thought_id, author, content, time) VALUES (?, ?, ?, ?)',
    [id, author, content, time],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      res.json({
        id: this.lastID,
        thought_id: parseInt(id),
        author,
        content,
        time
      });
    }
  );
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;