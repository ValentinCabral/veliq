import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
export type Scope={user:string;workspace:string;project:string;session:string;agent:string};
export type MemoryKind='episodic'|'semantic'|'project'|'operational'|'decision'|'error'|'preference'|'reference';
export class MemoryStore {
  db:DatabaseSync;
  constructor(path:string){if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});this.db=new DatabaseSync(path);this.db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS content (hash TEXT PRIMARY KEY, body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS memory (id TEXT NOT NULL, user TEXT NOT NULL, workspace TEXT NOT NULL, project TEXT NOT NULL, session TEXT NOT NULL, agent TEXT NOT NULL, kind TEXT NOT NULL, version INTEGER NOT NULL, hash TEXT, provenance TEXT NOT NULL, created_at TEXT NOT NULL, invalidated INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(id,user,workspace,project,session,agent,version));
    CREATE TABLE IF NOT EXISTS metrics (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, mode TEXT NOT NULL, strategy TEXT NOT NULL, original_count INTEGER, optimized_count INTEGER, overhead_count INTEGER, count_kind TEXT NOT NULL, fallback TEXT);
  `)}
  static hash(body:string){return createHash('sha256').update(body).digest('hex')}
  putContent(body:string){const hash=MemoryStore.hash(body);this.db.prepare('INSERT OR IGNORE INTO content(hash,body) VALUES (?,?)').run(hash,body);return hash;}
  getContent(hash:string){const row=this.db.prepare('SELECT body FROM content WHERE hash=?').get(hash) as {body:string}|undefined;if(!row||MemoryStore.hash(row.body)!==hash)throw new Error('Referencia faltante o alterada');return row.body;}
  put(id:string,scope:Scope,kind:MemoryKind,body:string,provenance:string,expectedVersion?:number){
    if(!id||!provenance)throw new Error('Identificador y procedencia obligatorios');
    const tx=()=>{const old=this.latest(id,scope);if(expectedVersion!==undefined&&expectedVersion!==(old?.version??0))throw new Error('Conflicto de versión');
      const version=(old?.version??0)+1,hash=this.putContent(body);
      this.db.prepare('INSERT INTO memory VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(id,scope.user,scope.workspace,scope.project,scope.session,scope.agent,kind,version,hash,provenance,new Date().toISOString(),0);return {id,version,hash};};
    this.db.exec('BEGIN IMMEDIATE');try{const result=tx();this.db.exec('COMMIT');return result}catch(e){this.db.exec('ROLLBACK');throw e}
  }
  latest(id:string,s:Scope){return this.db.prepare('SELECT * FROM memory WHERE id=? AND user=? AND workspace=? AND project=? AND session=? AND agent=? ORDER BY version DESC LIMIT 1').get(id,s.user,s.workspace,s.project,s.session,s.agent) as {version:number;hash:string;invalidated:number}|undefined}
  invalidate(id:string,s:Scope,expectedVersion:number){const current=this.latest(id,s);if(!current||current.version!==expectedVersion)throw new Error('Conflicto de versión');this.db.prepare('INSERT INTO memory SELECT id,user,workspace,project,session,agent,kind,version+1,hash,provenance,?,1 FROM memory WHERE id=? AND user=? AND workspace=? AND project=? AND session=? AND agent=? AND version=?').run(new Date().toISOString(),id,s.user,s.workspace,s.project,s.session,s.agent,expectedVersion)}
  retrieve(s:Scope,query='',limit=20){return this.db.prepare(`SELECT m.* FROM memory m WHERE user=? AND workspace=? AND project=? AND session=? AND agent=? AND version=(SELECT MAX(version) FROM memory x WHERE x.id=m.id AND x.user=m.user AND x.workspace=m.workspace AND x.project=m.project AND x.session=m.session AND x.agent=m.agent) AND invalidated=0 AND (m.id LIKE ? OR EXISTS (SELECT 1 FROM content c WHERE c.hash=m.hash AND c.body LIKE ?)) ORDER BY created_at DESC LIMIT ?`).all(s.user,s.workspace,s.project,s.session,s.agent,`%${query}%`,`%${query}%`,Math.min(100,Math.max(1,limit))) as Record<string,unknown>[]}
  metric(row:{mode:string;strategy:string;original?:number;optimized?:number;overhead?:number;kind:string;fallback?:string}){this.db.prepare('INSERT INTO metrics(at,mode,strategy,original_count,optimized_count,overhead_count,count_kind,fallback) VALUES (?,?,?,?,?,?,?,?)').run(new Date().toISOString(),row.mode,row.strategy,row.original??null,row.optimized??null,row.overhead??null,row.kind,row.fallback??null)}
  metrics(){return this.db.prepare('SELECT * FROM metrics ORDER BY id DESC LIMIT 500').all()}
  close(){this.db.close()}
}
export const defaultScope:Scope={user:'local',workspace:'default',project:'veliq',session:'demo',agent:'agent:1'};
