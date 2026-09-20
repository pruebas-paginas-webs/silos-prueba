import fs from 'node:fs';
import {config} from '../../server/config.js';
import {createApp} from '../../server/app.js';
const [dir,point,file]=process.argv.slice(2);const ctx=createApp(config({dataDir:dir}),{fault:stage=>{if(stage===point)process.exit(81);}});await ctx.images.upload(fs.readFileSync(file),'crash-admin','crash-'+point);ctx.close();
