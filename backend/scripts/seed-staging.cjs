// Explicit opt-in only. Never loads .env or imports HTTP/provider controllers.
const mongoose = require('mongoose');
const { stagingDatabaseErrors } = require('../services/staging-safety');
const User = require('../models/user');

(async () => {
  if (process.env.ONELIFE_SEED_CONFIRM !== 'onelife-staging-synthetic-only') throw new Error('Missing confirmation');
  const uri = process.env.ONELIFE_STAGING_DATABASE_URL;
  const errors = stagingDatabaseErrors({ DATABASE_URL: uri, STAGING_MONGO_HOST: process.env.ONELIFE_STAGING_MONGO_HOST, STAGING_MONGO_DATABASE: 'onelife_staging' });
  if (errors.length) throw new Error('Staging target mismatch');
  const passwords = ['ADMIN','DOCTOR','PATIENT'].map(role => process.env[`ONELIFE_SEED_${role}_PASSWORD`] || '');
  if (passwords.some(value => value.length < 16 || /replace|example|change-me/i.test(value)) || new Set(passwords).size !== 3) throw new Error('Use three distinct random passwords');
  mongoose.set('autoIndex', false);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  if (mongoose.connection.name !== 'onelife_staging' || await User.countDocuments() !== 0) throw new Error('Use a new empty dedicated staging database');
  const accounts = [
    { fullname:'Synthetic Staging Admin', email:'admin@onelife.example.test', role:'ADMIN', password:passwords[0] },
    { fullname:'Synthetic Staging Doctor', email:'doctor@onelife.example.test', role:'DOCTOR', password:passwords[1], speciality:'General physician', degree:'MBBS', experience:'4', fees:500, available:true },
    { fullname:'Synthetic Staging Doctor Paused', email:'doctor-paused@onelife.example.test', role:'DOCTOR', password:passwords[1], speciality:'General physician', degree:'MBBS', experience:'4', fees:500, available:false },
    { fullname:'Synthetic Staging Patient A', email:'patient-a@onelife.example.test', role:'NORMAL', password:passwords[2] },
    { fullname:'Synthetic Staging Patient B', email:'patient-b@onelife.example.test', role:'NORMAL', password:passwords[2] },
  ];
  for (const account of accounts) await User.create({ ...account, number:'', address:{line1:'Synthetic clinic',line2:'Test records only'}, image:'/assets/onelife-avatar.svg' });
  console.log('Created five synthetic staging accounts using model password hashing; credentials not printed.');
})().catch(() => { console.error('Staging seed refused or failed. No credentials printed; inspect partial synthetic records privately before retrying.'); process.exitCode=1; }).finally(async () => { await mongoose.disconnect(); });
