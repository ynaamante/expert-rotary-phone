const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads folder exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// MySQL setup
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'vetclinic'
});
db.connect(err => {
  if (err) throw err;
  console.log('Connected to MySQL');
});

// Registration
app.post('/doctors', upload.single('photo'), (req, res) => {
  const { username, password, display_name } = req.body;
  const photo = req.file ? req.file.filename : null;
  if (!username || !password || !display_name || !photo) {
    return res.status(400).json({ error: 'Fill all fields including photo' });
  }

  db.query(
    'INSERT INTO doctors (username, password, display_name, photo) VALUES (?, ?, ?, ?)',
    [username, password, display_name, photo],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: result.insertId });
    }
  );
});

// Login
app.post('/doctors/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  db.query(
    'SELECT doctor_id, username, display_name, photo FROM doctors WHERE username = ? AND password = ?',
    [username, password],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
      res.json(results[0]);
    }
  );
});


// --- PETS CRUD ---
// GET all pets with owner name
app.get('/pets', (req, res) => {
  db.query(
    `SELECT pets.*, owners.name as owner
     FROM pets
     LEFT JOIN owners ON pets.owner_id = owners.owner_id`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// GET single pet by ID (with owner name)
app.get('/pets/:id', (req, res) => {
  db.query(
    `SELECT pets.*, owners.name as owner
     FROM pets
     LEFT JOIN owners ON pets.owner_id = owners.owner_id
     WHERE pets.pet_id = ?`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rows.length === 0) return res.status(404).json({ error: "Pet not found" });
      res.json(rows[0]);
    }
  );
});

// ADD new pet (expects owner name in body)
app.post('/pets', (req, res) => {
  const { name, species, breed, age, owner, medical_notes, last_visit } = req.body;
  console.log('[POST /pets] Incoming body:', req.body);

  db.query('SELECT owner_id FROM owners WHERE name = ?', [owner], (err, results) => {
    if (err) {
      console.error('[POST /pets] DB Error (owner lookup):', err);
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      console.warn('[POST /pets] Owner not found:', owner);
      return res.status(400).json({ error: 'Owner not found' });
    }

    const owner_id = results[0].owner_id;
    console.log('[POST /pets] Inserting pet with owner_id:', owner_id);

    db.query(
      'INSERT INTO pets (name, species, breed, age, owner_id, medical_notes, last_visit) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, species, breed, age, owner_id, medical_notes, last_visit || null],
      (err, result) => {
        if (err) {
          console.error('[POST /pets] DB Error (insert):', err);
          return res.status(500).json({ error: err.message });
        }
        console.log('[POST /pets] Inserted pet with ID:', result.insertId);
        res.json({ success: true, pet_id: result.insertId });
      }
    );
  });
});

// UPDATE a pet by ID (now accepts last_visit and owner name)
app.put('/pets/:id', (req, res) => {
  const { name, species, breed, age, owner, medical_notes, last_visit } = req.body;
  console.log('[PUT /pets/:id] req.body:', req.body);

  // Find owner_id from owners table based on owner name
  db.query('SELECT owner_id FROM owners WHERE name = ?', [owner], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(400).json({ error: 'Owner not found' });
    const owner_id = results[0].owner_id;

    console.log('[PUT /pets/:id] About to UPDATE with:', {
      name, species, breed, age, owner_id, medical_notes, last_visit, pet_id: req.params.id
    });

    db.query(
      'UPDATE pets SET name=?, species=?, breed=?, age=?, owner_id=?, medical_notes=?, last_visit=? WHERE pet_id=?',
      [name, species, breed, age, owner_id, medical_notes, last_visit || null, req.params.id],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        db.query('SELECT last_visit FROM pets WHERE pet_id=?', [req.params.id], (err2, rows) => {
          if (err2) return res.status(500).json({ error: err2.message });
          console.log('[PUT /pets/:id] DB last_visit after update:', rows[0]);
          res.json({ success: true, last_visit: rows[0]?.last_visit });
        });
      }
    );
  });
});

// DELETE a pet by ID
app.delete('/pets/:id', (req, res) => {
  db.query('DELETE FROM pets WHERE pet_id = ?', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- OWNERS CRUD ---
app.get('/owners', (req, res) => {
    db.query(`
        SELECT
            o.owner_id,
            o.name,
            o.phone,
            o.email,
            o.address,
            COUNT(p.pet_id) AS pet_count
        FROM owners o
        LEFT JOIN pets p ON o.owner_id = p.owner_id
        GROUP BY o.owner_id, o.name, o.phone, o.email, o.address
        ORDER BY o.owner_id
    `, (err, rows) => {
        if (err) return res.status(500).send(err);
        res.json(rows);
    });
});

app.get('/owners/:id', (req, res) => {
    db.query('SELECT * FROM owners WHERE owner_id=?', [req.params.id], (err, rows) => {
        if (err) return res.status(500).send(err);
        res.json(rows[0]);
    });
});

app.post('/owners', (req, res) => {
    const { name, phone, email, address } = req.body;
    db.query('INSERT INTO owners (name, phone, email, address) VALUES (?, ?, ?, ?)', [name, phone, email, address], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true, id: result.insertId });
    });
});

app.put('/owners/:id', (req, res) => {
    const { name, phone, email, address } = req.body;
    db.query('UPDATE owners SET name=?, phone=?, email=?, address=? WHERE owner_id=?', [name, phone, email, address, req.params.id], (err) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true });
    });
});

app.delete('/owners/:id', (req, res) => {
    db.query('DELETE FROM owners WHERE owner_id=?', [req.params.id], (err) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true });
    });
});

// --- APPOINTMENTS CRUD ---
app.get('/appointments', (req, res) => {
    db.query(`SELECT a.*, p.name as pet, o.name as owner FROM appointments a
        LEFT JOIN pets p ON a.pet_id = p.pet_id
        LEFT JOIN owners o ON a.owner_id = o.owner_id`, (err, rows) => {
        if (err) return res.status(500).send(err);
        res.json(rows);
    });
});

app.get('/appointments/:id', (req, res) => {
    db.query('SELECT * FROM appointments WHERE appt_id=?', [req.params.id], (err, rows) => {
        if (err) return res.status(500).send(err);
        res.json(rows[0]);
    });
});

app.post('/appointments', (req, res) => {
    const { date_time, pet_id, owner_id, type, status, notes } = req.body;
    db.query('INSERT INTO appointments (date_time, pet_id, owner_id, type, status, notes) VALUES (?, ?, ?, ?, ?, ?)', [date_time, pet_id, owner_id, type, status, notes], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true, id: result.insertId });
    });
});

app.put('/appointments/:id', (req, res) => {
    const { date_time, pet_id, owner_id, type, status, notes } = req.body;
    db.query(
        'UPDATE appointments SET date_time=?, pet_id=?, owner_id=?, type=?, status=?, notes=? WHERE appt_id=?',
        [date_time, pet_id, owner_id, type, status, notes, req.params.id],
        (err) => {
            if (err) {
                console.error("Appointment update error:", err);
                return res.status(500).send(err);
            }

            console.log('[Appointment Updated]', { status, pet_id, date_time, appt_id: req.params.id });

            // Only update pet last_visit if appointment is completed and pet_id is present
            const petIdNum = Number(pet_id);
            if (status && status.toLowerCase() === 'completed' && pet_id) {
                const lastVisitDate = date_time ? date_time.slice(0, 10) : new Date().toISOString().slice(0, 10);
                console.log('Updating last_visit for pet_id', pet_id, 'to', lastVisitDate);

                db.query(
                    'UPDATE pets SET last_visit=? WHERE pet_id=?',
                    [lastVisitDate, petIdNum],
                    (err2, result2) => {
                        if (err2) {
                            console.error('Error updating last_visit:', err2);
                            return res.status(500).send(err2);
                        }
                        if (result2.affectedRows === 0) {
                            console.warn('No pet found with pet_id', petIdNum, 'for last_visit update');
                        }
                        // You can even fetch and log the last_visit here
                        db.query('SELECT last_visit FROM pets WHERE pet_id=?', [petIdNum], (err3, rows) => {
                            if (rows && rows.length) {
                                console.log('Fetched last_visit:', rows[0].last_visit);
                            }
                            res.json({ success: true, last_visit_updated: result2.affectedRows > 0 });
                        });
                    }
                );
            } else {
                res.json({ success: true, last_visit_updated: false, reason: 'status not completed or missing pet_id' });
            }
        }
    );
});

app.delete('/appointments/:id', (req, res) => {
    db.query('DELETE FROM appointments WHERE appt_id=?', [req.params.id], (err) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true });
    });
});

// --- TREATMENTS CRUD ---
app.get('/treatments', (req, res) => {
    db.query(`SELECT t.*, p.name as pet FROM treatments t
        LEFT JOIN pets p ON t.pet_id = p.pet_id`, (err, rows) => {
        if (err) return res.status(500).send(err);
        res.json(rows);
    });
});

app.get('/treatments/:id', (req, res) => {
    db.query('SELECT * FROM treatments WHERE treatment_id=?', [req.params.id], (err, rows) => {
        if (err) return res.status(500).send(err);
        res.json(rows[0]);
    });
});

app.post('/treatments', (req, res) => {
    const { pet_id, date, diagnosis, treatment, medication, cost } = req.body;
    db.query('INSERT INTO treatments (pet_id, date, diagnosis, treatment, medication, cost) VALUES (?, ?, ?, ?, ?, ?)',
        [pet_id, date, diagnosis, treatment, medication, cost], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true, id: result.insertId });
    });
});

app.put('/treatments/:id', (req, res) => {
    const { pet_id, date, diagnosis, treatment, medication, cost } = req.body;
    db.query('UPDATE treatments SET pet_id=?, date=?, diagnosis=?, treatment=?, medication=?, cost=? WHERE treatment_id=?',
        [pet_id, date, diagnosis, treatment, medication, cost, req.params.id], (err) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true });
    });
});

app.delete('/treatments/:id', (req, res) => {
    db.query('DELETE FROM treatments WHERE treatment_id=?', [req.params.id], (err) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true });
    });
});

// --- VACCINATIONS CRUD ---
app.get('/vaccinations', (req, res) => {
    db.query(`SELECT v.*, p.name as pet FROM vaccinations v
        LEFT JOIN pets p ON v.pet_id = p.pet_id`, (err, rows) => {
        if (err) return res.status(500).send(err);
        res.json(rows);
    });
});

app.get('/vaccinations/:id', (req, res) => {
    db.query('SELECT * FROM vaccinations WHERE vacc_id=?', [req.params.id], (err, rows) => {
        if (err) return res.status(500).send(err);
        res.json(rows[0]);
    });
});

app.post('/vaccinations', (req, res) => {
    const { pet_id, vaccination_type, date_given, next_due, status, administered_by } = req.body;
    db.query('INSERT INTO vaccinations (pet_id, vaccination_type, date_given, next_due, status, administered_by) VALUES (?, ?, ?, ?, ?, ?)',
        [pet_id, vaccination_type, date_given, next_due, status, administered_by], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true, id: result.insertId });
    });
});

app.put('/vaccinations/:id', (req, res) => {
    const { pet_id, vaccination_type, date_given, next_due, status, administered_by } = req.body;
    db.query('UPDATE vaccinations SET pet_id=?, vaccination_type=?, date_given=?, next_due=?, status=?, administered_by=? WHERE vacc_id=?',
        [pet_id, vaccination_type, date_given, next_due, status, administered_by, req.params.id], (err) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true });
    });
});

app.delete('/vaccinations/:id', (req, res) => {
    db.query('DELETE FROM vaccinations WHERE vacc_id=?', [req.params.id], (err) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true });
    });
});

app.listen(5000, () => console.log('Server running on port 5000'));