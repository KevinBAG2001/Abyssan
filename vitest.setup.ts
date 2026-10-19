import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Aísla Git del ~/.gitconfig del desarrollador (insteadOf, commit.gpgsign, etc.).
 * Debe cargarse antes de cualquier subprocess git en los tests.
 */
const gitHome = fs.mkdtempSync(path.join(os.tmpdir(), 'abyssan-vitest-git-home-'));
const gitConfigGlobal = path.join(gitHome, 'gitconfig-vacio');
fs.writeFileSync(gitConfigGlobal, '', 'utf8');
fs.mkdirSync(path.join(gitHome, '.config'), { recursive: true });

process.env.HOME = gitHome;
process.env.USERPROFILE = gitHome;
process.env.XDG_CONFIG_HOME = path.join(gitHome, '.config');
process.env.GIT_CONFIG_GLOBAL = gitConfigGlobal;
process.env.GIT_CONFIG_NOSYSTEM = '1';
process.env.GIT_AUTHOR_NAME = 'Test Abyssan';
process.env.GIT_AUTHOR_EMAIL = 'test@abyssan.dev';
process.env.GIT_COMMITTER_NAME = 'Test Abyssan';
process.env.GIT_COMMITTER_EMAIL = 'test@abyssan.dev';
