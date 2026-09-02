// Austria: Enrutador HTTP que inyecta dependencias bajo arquitectura DDD
import { Router } from 'express';
import { SimpleGitAdapter } from '../../../infrastructure/git/SimpleGitAdapter.js';
import { commandLogAdapter } from '../../../infrastructure/logging/InMemoryCommandLogAdapter.js';
import { GitUseCases } from '../../../application/use-cases/GitUseCases.js';
import { GitController } from '../controllers/GitController.js';

export const gitRepository = new SimpleGitAdapter(commandLogAdapter);
const gitUseCases = new GitUseCases(gitRepository, commandLogAdapter);
const gitController = new GitController(gitUseCases);

export const gitRouter = Router();

// Rutas REST
gitRouter.get('/repos', (req, res) => gitController.listRepositories(req, res));
gitRouter.get('/status', (req, res) => gitController.getStatus(req, res));
gitRouter.get('/commits', (req, res) => gitController.getCommits(req, res));
gitRouter.get('/branches', (req, res) => gitController.getBranches(req, res));
gitRouter.get('/branches/compare', (req, res) => gitController.compareBranches(req, res));
gitRouter.post('/merge', (req, res) => gitController.merge(req, res));
gitRouter.get('/diff', (req, res) => gitController.getDiff(req, res));
gitRouter.post('/stage', (req, res) => gitController.stage(req, res));
gitRouter.post('/unstage', (req, res) => gitController.unstage(req, res));
gitRouter.post('/commit', (req, res) => gitController.commit(req, res));
gitRouter.post('/checkout', (req, res) => gitController.checkout(req, res));
gitRouter.post('/branch', (req, res) => gitController.createBranch(req, res));
gitRouter.post('/pull', (req, res) => gitController.pull(req, res));
gitRouter.post('/push', (req, res) => gitController.push(req, res));

// Remotos
gitRouter.get('/remotes', (req, res) => gitController.getRemotes(req, res));
gitRouter.post('/remote/add', (req, res) => gitController.addRemote(req, res));
gitRouter.post('/remote/remove', (req, res) => gitController.removeRemote(req, res));
gitRouter.post('/fetch', (req, res) => gitController.fetch(req, res));

// Stashes
gitRouter.get('/stashes', (req, res) => gitController.getStashes(req, res));
gitRouter.post('/stash/save', (req, res) => gitController.saveStash(req, res));
gitRouter.post('/stash/pop', (req, res) => gitController.popStash(req, res));
gitRouter.post('/stash/drop', (req, res) => gitController.dropStash(req, res));

// Tags
gitRouter.get('/tags', (req, res) => gitController.getTags(req, res));
gitRouter.post('/tag', (req, res) => gitController.createTag(req, res));

// Cherry-Pick, Revert, Reset
gitRouter.post('/cherry-pick', (req, res) => gitController.cherryPick(req, res));
gitRouter.post('/revert', (req, res) => gitController.revert(req, res));
gitRouter.post('/reset', (req, res) => gitController.reset(req, res));

gitRouter.post('/discard', (req, res) => gitController.discardArchivo(req, res));
gitRouter.post('/merge/abort', (req, res) => gitController.abortarMerge(req, res));
gitRouter.post('/merge/continue', (req, res) => gitController.continuarMerge(req, res));
gitRouter.post('/clone', (req, res) => gitController.clonarRepositorio(req, res));
gitRouter.post('/init', (req, res) => gitController.inicializarRepositorio(req, res));
gitRouter.post('/branch/delete', (req, res) => gitController.deleteLocalBranch(req, res));
gitRouter.post('/branch/rename', (req, res) => gitController.renameLocalBranch(req, res));
gitRouter.get('/amend-info', (req, res) => gitController.obtenerInfoAmend(req, res));
gitRouter.post('/amend', (req, res) => gitController.enmendarCommit(req, res));
gitRouter.get('/reflog', (req, res) => gitController.obtenerReflog(req, res));
gitRouter.get('/deshacer', (req, res) => gitController.obtenerUltimaOperacion(req, res));
gitRouter.get('/journal', (req, res) => gitController.listarJournal(req, res));
gitRouter.post('/deshacer', (req, res) => gitController.deshacer(req, res));

// Identidad git
gitRouter.get('/identity', (req, res) => gitController.obtenerIdentidad(req, res));
gitRouter.post('/identity', (req, res) => gitController.configurarIdentidad(req, res));

// Preview de operaciones peligrosas
gitRouter.post('/preview', (req, res) => gitController.previewOperacion(req, res));

// Conflictos
gitRouter.get('/conflict', (req, res) => gitController.getConflict(req, res));
gitRouter.post('/conflict/resolve', (req, res) => gitController.resolveConflict(req, res));

// Auditoria
gitRouter.get('/logs', (req, res) => gitController.getLogs(req, res));
gitRouter.get('/operaciones', (req, res) => gitController.listarOperaciones(req, res));
