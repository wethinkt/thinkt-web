var Ze=Object.defineProperty;var Ge=(r,e,t)=>e in r?Ze(r,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):r[e]=t;var h=(r,e,t)=>Ge(r,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))i(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&i(a)}).observe(document,{childList:!0,subtree:!0});function t(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(n){if(n.ep)return;n.ep=!0;const s=t(n);fetch(n.href,s)}})();class ge extends Error{constructor(t,i,n){super(t);h(this,"statusCode");h(this,"response");this.statusCode=i,this.response=n,this.name="ThinktAPIError"}}class fe extends Error{constructor(t,i){super(t);h(this,"originalError");this.originalError=i,this.name="ThinktNetworkError"}}const Xe={baseUrl:"http://localhost:7433",apiVersion:"/api/v1",timeout:3e4};function C(r,e,t,i){let n=`${r}${e}${t}`;if(i&&Object.keys(i).length>0){const s=new URLSearchParams;for(const[o,c]of Object.entries(i))c!=null&&s.append(o,String(c));const a=s.toString();a&&(n+=`?${a}`)}return n}class Ye{constructor(e){h(this,"config");this.config={...Xe,...e}}setConfig(e){this.config={...this.config,...e}}getConfig(){return{...this.config}}async fetchWithTimeout(e,t={}){const i=new AbortController,n=setTimeout(()=>i.abort(),this.config.timeout),s=this.config.fetch??fetch;try{const a=await s(e,{...t,signal:i.signal,headers:{Accept:"application/json",...t.headers}});if(clearTimeout(n),!a.ok){let o;try{o=await a.json()}catch{}throw new ge((o==null?void 0:o.message)||`HTTP ${a.status}: ${a.statusText}`,a.status,o)}return await a.json()}catch(a){throw clearTimeout(n),a instanceof ge?a:a instanceof Error&&a.name==="AbortError"?new fe(`Request timeout after ${this.config.timeout}ms`,a):new fe(a instanceof Error?a.message:"Network error",a)}}async getSources(){const e=C(this.config.baseUrl,this.config.apiVersion,"/sources");return(await this.fetchWithTimeout(e)).sources??[]}async getProjects(e){const t=C(this.config.baseUrl,this.config.apiVersion,"/projects",{source:e});return(await this.fetchWithTimeout(t)).projects??[]}async getSessions(e){const t=encodeURIComponent(e),i=C(this.config.baseUrl,this.config.apiVersion,`/projects/${t}/sessions`);return(await this.fetchWithTimeout(i)).sessions??[]}async getSession(e,t){const i=encodeURIComponent(e),n=C(this.config.baseUrl,this.config.apiVersion,`/sessions/${i}`,{limit:t==null?void 0:t.limit,offset:t==null?void 0:t.offset}),s=await this.fetchWithTimeout(n);return{meta:s.meta,entries:s.entries??[],total:s.total??0,has_more:s.has_more??!1}}async openIn(e,t){const i=C(this.config.baseUrl,this.config.apiVersion,"/open-in"),n=await this.fetchWithTimeout(i,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({app:e,path:t})});if(n.error)throw new Error(n.error)}async getOpenInApps(){const e=C(this.config.baseUrl,this.config.apiVersion,"/open-in/apps");return(await this.fetchWithTimeout(e)).apps??[]}async search(e){const t={q:e.query,project:e.project,source:e.source,limit:e.limit,limit_per_session:e.limitPerSession};e.caseSensitive&&(t.case_sensitive="true"),e.regex&&(t.regex="true");const i=C(this.config.baseUrl,this.config.apiVersion,"/search",t);return await this.fetchWithTimeout(i)}async*streamSessionEntries(e,t=100){let i=0,n=!0;for(;n;){const s=await this.getSession(e,{limit:t,offset:i});for(const a of s.entries)yield a;if(n=s.has_more,i+=s.entries.length,s.entries.length===0)break}}async getAllSessionEntries(e,t=100){const i=[];for await(const n of this.streamSessionEntries(e,t))i.push(n);return i}}function se(r){return r==="kimi"?"kimi":r==="gemini"?"gemini":"claude"}function Qe(r){switch(r){case"user":return"user";case"assistant":return"assistant";case"tool":return"tool";case"system":return"system";case"summary":return"summary";case"progress":return"progress";case"checkpoint":return"checkpoint";default:return"assistant"}}function Je(r){switch(r.type??"text"){case"text":return{type:"text",text:r.text??""};case"thinking":return{type:"thinking",thinking:r.thinking??"",signature:r.signature};case"tool_use":return{type:"tool_use",toolUseId:r.tool_use_id??"",toolName:r.tool_name??"unknown",toolInput:r.tool_input??{}};case"tool_result":return{type:"tool_result",toolUseId:r.tool_use_id??"",toolResult:r.tool_result??"",isError:r.is_error??!1};case"image":return{type:"image",mediaType:r.media_type??"image/png",mediaData:r.media_data??""};case"document":return{type:"document",mediaType:r.media_type??"application/pdf",mediaData:r.media_data??"",filename:void 0};default:return{type:"text",text:r.text??""}}}function et(r){return{id:r.id??"",name:r.name??"",path:r.path??"",displayPath:r.display_path,sessionCount:r.session_count??0,lastModified:r.last_modified?new Date(r.last_modified):void 0,source:se(r.source),workspaceId:r.workspace_id,sourceBasePath:r.source_base_path,pathExists:r.path_exists??!0}}function ke(r){return{id:r.id??"unknown",projectPath:r.project_path,fullPath:r.full_path,firstPrompt:r.first_prompt,summary:r.summary,entryCount:r.entry_count??0,fileSize:r.file_size,createdAt:r.created_at?new Date(r.created_at):void 0,modifiedAt:r.modified_at?new Date(r.modified_at):void 0,gitBranch:r.git_branch,model:r.model,source:se(r.source),workspaceId:r.workspace_id,chunkCount:r.chunk_count,title:r.first_prompt?r.first_prompt.slice(0,60)+(r.first_prompt.length>60?"...":""):r.id??"Untitled Session"}}function be(r){var i;const e=((i=r.content_blocks)==null?void 0:i.map(Je))??[],t={};return r.metadata&&Object.assign(t,r.metadata),r.workspace_id&&(t.workspaceId=r.workspace_id),{uuid:r.uuid??`entry-${Date.now()}-${Math.random().toString(36).slice(2)}`,parentUuid:r.parent_uuid??void 0,role:Qe(r.role),timestamp:r.timestamp?new Date(r.timestamp):new Date,source:se(r.source),contentBlocks:e,text:r.text??e.filter(n=>n.type==="text").map(n=>n.text).join(`
`),model:r.model,usage:r.usage?{inputTokens:r.usage.input_tokens??0,outputTokens:r.usage.output_tokens??0,cacheCreationInputTokens:r.usage.cache_creation_input_tokens,cacheReadInputTokens:r.usage.cache_read_input_tokens}:void 0,gitBranch:r.git_branch,cwd:r.cwd,isCheckpoint:r.is_checkpoint??!1,isSidechain:r.is_sidechain??!1,agentId:r.agent_id,sourceAgentId:r.source_agent_id,metadata:Object.keys(t).length>0?t:void 0}}class Ae{constructor(e){h(this,"_api");this._api=new Ye(e)}get api(){return this._api}setConfig(e){this._api.setConfig(e)}getConfig(){return this._api.getConfig()}async getSources(){return this._api.getSources()}async getProjects(e){return(await this._api.getProjects(e)).map(et)}async getSessions(e){return(await this._api.getSessions(e)).map(ke)}async getSession(e,t){const i=await this._api.getSession(e,t);return{meta:ke(i.meta),entries:i.entries.map(be),total:i.total,hasMore:i.has_more}}async openIn(e,t){return this._api.openIn(e,t)}async getOpenInApps(){return this._api.getOpenInApps()}async search(e){return this._api.search(e)}async*streamSessionEntries(e,t){for await(const i of this._api.streamSessionEntries(e,t))yield be(i)}async getAllSessionEntries(e,t){const i=[];for await(const n of this.streamSessionEntries(e,t))i.push(n);return i}}let z=null;function A(){return z||(z=new Ae),z}function tt(r){z?z.setConfig(r):z=new Ae(r)}const it=`
.thinkt-project-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: var(--thinkt-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  color: var(--thinkt-text-color, #e0e0e0);
  background: var(--thinkt-bg-color, #1a1a1a);
}

.thinkt-project-browser__header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--thinkt-border-color, #333);
  flex-shrink: 0;
}

.thinkt-project-browser__toolbar {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.thinkt-project-browser__search {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 4px;
  background: var(--thinkt-input-bg, #252525);
  color: inherit;
  font-size: 13px;
}

.thinkt-project-browser__search:focus {
  outline: none;
  border-color: var(--thinkt-accent-color, #6366f1);
}

.thinkt-project-browser__search::placeholder {
  color: var(--thinkt-muted-color, #666);
}

.thinkt-project-browser__filter {
  padding: 6px 8px;
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 4px;
  background: var(--thinkt-input-bg, #252525);
  color: inherit;
  font-size: 12px;
  min-width: 90px;
}

.thinkt-project-browser__stats {
  font-size: 11px;
  color: var(--thinkt-muted-color, #666);
}

.thinkt-project-browser__content {
  flex: 1;
  overflow-y: auto;
}

.thinkt-project-browser__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.thinkt-project-browser__item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.12s ease;
  border-bottom: 1px solid var(--thinkt-border-color, #252525);
  border-left: 2px solid transparent;
}

.thinkt-project-browser__item:hover {
  background: var(--thinkt-hover-bg, #252525);
}

.thinkt-project-browser__item--selected {
  background: var(--thinkt-selected-bg, rgba(99, 102, 241, 0.15));
  border-left-color: var(--thinkt-accent-color, #6366f1);
}

.thinkt-project-browser__icon {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  font-size: 14px;
  flex-shrink: 0;
}

.thinkt-project-browser__icon--claude {
  background: rgba(217, 119, 80, 0.15);
  color: #d97750;
}

.thinkt-project-browser__icon--kimi {
  background: rgba(25, 195, 155, 0.15);
  color: #19c39b;
}

.thinkt-project-browser__icon--gemini {
  background: rgba(99, 102, 241, 0.15);
  color: #6366f1;
}

.thinkt-project-browser__info {
  flex: 1;
  min-width: 0;
}

.thinkt-project-browser__name {
  font-weight: 500;
  font-size: 13px;
  margin-bottom: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--thinkt-text-color, #e0e0e0);
}

.thinkt-project-browser__path {
  font-size: 11px;
  color: var(--thinkt-muted-color, #666);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thinkt-project-browser__meta {
  text-align: right;
  font-size: 11px;
  color: var(--thinkt-muted-color, #666);
}

.thinkt-project-browser__count {
  display: block;
  font-weight: 500;
  color: var(--thinkt-text-color, #e0e0e0);
}

.thinkt-project-browser__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--thinkt-muted-color, #888);
}

.thinkt-project-browser__empty {
  text-align: center;
  padding: 48px;
  color: var(--thinkt-muted-color, #888);
}

.thinkt-project-browser__error {
  padding: 16px;
  margin: 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
}

.thinkt-project-browser__retry {
  margin-top: 8px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
}

.thinkt-project-browser__retry:hover {
  background: rgba(239, 68, 68, 0.2);
}
`;class nt{constructor(e){h(this,"elements");h(this,"options");h(this,"client");h(this,"projects",[]);h(this,"filteredProjects",[]);h(this,"searchQuery","");h(this,"currentSourceFilter",null);h(this,"selectedIndex",-1);h(this,"isLoading",!1);h(this,"itemElements",new Map);h(this,"boundHandlers",[]);h(this,"disposed",!1);h(this,"stylesInjected",!1);this.elements=e.elements,this.options={...e,enableSearch:e.enableSearch??!0,enableSourceFilter:e.enableSourceFilter??!0,classPrefix:e.classPrefix??"thinkt-project-browser"},this.currentSourceFilter=e.initialSource??null,this.client=e.client??A(),this.init(),this.loadProjects(this.currentSourceFilter??void 0)}init(){this.injectStyles(),this.createStructure(),this.attachListeners()}injectStyles(){if(this.stylesInjected)return;const e="thinkt-project-browser-styles";if(!document.getElementById(e)){const t=document.createElement("style");t.id=e,t.textContent=it,document.head.appendChild(t)}this.stylesInjected=!0}createStructure(){const{container:e}=this.elements,{classPrefix:t}=this.options;e.className=t;const i=document.createElement("div");i.className=`${t}__header`;const n=this.options.enableSearch||this.options.enableSourceFilter,s=document.createElement("div");if(s.className=`${t}__toolbar`,this.options.enableSearch){const l=this.elements.searchInput??document.createElement("input");l.className=`${t}__search`,l.type="text",l.placeholder="Search projects...",l.value=this.searchQuery,this.elements.searchInput||(this.elements.searchInput=l,s.appendChild(l))}if(this.options.enableSourceFilter){const l=this.elements.sourceFilter??document.createElement("select");l.className=`${t}__filter`,l.innerHTML=`
        <option value="">All Sources</option>
        <option value="claude">Claude</option>
        <option value="kimi">Kimi</option>
        <option value="gemini">Gemini</option>
      `,l.value=this.currentSourceFilter??"",this.elements.sourceFilter||(this.elements.sourceFilter=l,s.appendChild(l))}n&&s.childElementCount>0&&i.appendChild(s);const a=document.createElement("div");a.className=`${t}__stats`,a.textContent="Loading...",i.appendChild(a),e.appendChild(i);const o=document.createElement("div");o.className=`${t}__content`;const c=document.createElement("ul");c.className=`${t}__list`,c.setAttribute("role","listbox"),o.appendChild(c),this.elements.loadingIndicator||(this.elements.loadingIndicator=document.createElement("div"),this.elements.loadingIndicator.className=`${t}__loading`,this.elements.loadingIndicator.textContent="Loading projects..."),o.appendChild(this.elements.loadingIndicator),this.elements.errorDisplay||(this.elements.errorDisplay=document.createElement("div"),this.elements.errorDisplay.className=`${t}__error`,this.elements.errorDisplay.style.display="none"),o.appendChild(this.elements.errorDisplay),e.appendChild(o)}attachListeners(){const{searchInput:e,sourceFilter:t,container:i}=this.elements;if(e){const s=()=>{this.searchQuery=e.value.toLowerCase(),this.filterProjects()};e.addEventListener("input",s),this.boundHandlers.push(()=>e.removeEventListener("input",s))}if(t){const s=()=>{this.currentSourceFilter=t.value||null,this.loadProjects(this.currentSourceFilter??void 0)};t.addEventListener("change",s),this.boundHandlers.push(()=>t.removeEventListener("change",s))}const n=s=>this.handleKeydown(s);i.addEventListener("keydown",n),this.boundHandlers.push(()=>i.removeEventListener("keydown",n)),i.setAttribute("tabindex","0")}handleKeydown(e){if(this.filteredProjects.length!==0)switch(e.key){case"ArrowDown":e.preventDefault(),this.selectIndex(Math.min(this.selectedIndex+1,this.filteredProjects.length-1));break;case"ArrowUp":e.preventDefault(),this.selectIndex(Math.max(this.selectedIndex-1,0));break;case"Enter":this.selectedIndex>=0&&this.selectProject(this.filteredProjects[this.selectedIndex]);break;case"Home":e.preventDefault(),this.selectIndex(0);break;case"End":e.preventDefault(),this.selectIndex(this.filteredProjects.length-1);break}}async loadProjects(e){var i,n,s,a;if(this.isLoading)return;typeof e=="string"&&(this.currentSourceFilter=e||null);const t=this.currentSourceFilter??void 0;this.isLoading=!0,this.showLoading(!0),this.showError(null);try{this.projects=await this.client.getProjects(t),this.filterProjects(),Promise.resolve((n=(i=this.options).onProjectsLoaded)==null?void 0:n.call(i,this.projects))}catch(o){const c=o instanceof Error?o:new Error(String(o));this.showError(c),(a=(s=this.options).onError)==null||a.call(s,c)}finally{this.isLoading=!1,this.showLoading(!1);const o=this.currentSourceFilter??void 0;o!==t&&this.loadProjects(o)}}showLoading(e){this.elements.loadingIndicator&&(this.elements.loadingIndicator.style.display=e?"flex":"none");const t=this.elements.container.querySelector(`.${this.options.classPrefix}__list`);t&&(t.style.display=e?"none":"block")}showError(e){if(this.elements.errorDisplay)if(e){this.elements.errorDisplay.innerHTML="";const t=document.createElement("div");t.textContent=e.message,this.elements.errorDisplay.appendChild(t);const i=document.createElement("button");i.className=`${this.options.classPrefix}__retry`,i.textContent="Retry",i.addEventListener("click",()=>{this.loadProjects(this.currentSourceFilter??void 0)}),this.elements.errorDisplay.appendChild(i),this.elements.errorDisplay.style.display="block"}else this.elements.errorDisplay.style.display="none"}filterProjects(){const e=this.searchQuery.trim();this.filteredProjects=this.projects.filter(t=>{var n,s;return!e||((n=t.name)==null?void 0:n.toLowerCase().includes(e))||((s=t.path)==null?void 0:s.toLowerCase().includes(e))}),this.selectedIndex=-1,this.render()}render(){this.updateStats(),this.renderList()}updateStats(){const e=this.elements.container.querySelector(`.${this.options.classPrefix}__stats`);if(e){const t=this.projects.length,i=this.filteredProjects.length;i===t?e.textContent=`${t} project${t!==1?"s":""}`:e.textContent=`Showing ${i} of ${t} projects`}}renderList(){var i;const e=this.elements.container.querySelector("ul");if(!e)return;if(e.innerHTML="",this.itemElements.clear(),this.elements.container.querySelectorAll(`.${this.options.classPrefix}__empty`).forEach(n=>n.remove()),this.filteredProjects.length===0){const n=document.createElement("div");n.className=`${this.options.classPrefix}__empty`,n.textContent=this.projects.length===0?"No projects found":"No projects match your search",(i=e.parentElement)==null||i.appendChild(n);return}for(let n=0;n<this.filteredProjects.length;n++){const s=this.filteredProjects[n],a=this.renderProjectItem(s,n);e.appendChild(a),this.itemElements.set(this.projectKey(s,n),a)}}renderProjectItem(e,t){if(this.options.projectRenderer)return this.options.projectRenderer(e,t);const{classPrefix:i}=this.options,n=document.createElement("li");n.className=`${i}__item`,n.setAttribute("role","option"),n.setAttribute("aria-selected","false"),n.dataset.index=String(t),n.dataset.projectId=e.id;const s=e.source??"claude",a=`${i}__icon--${s}`;let o="🅲";return s==="kimi"&&(o="🅺"),s==="gemini"&&(o="🅶"),n.innerHTML=`
      <div class="${i}__icon ${a}">${o}</div>
      <div class="${i}__info">
        <div class="${i}__name">${this.escapeHtml(e.name??"Unknown")}</div>
        <div class="${i}__path">${this.escapeHtml(e.displayPath??e.path??"")}</div>
      </div>
      <div class="${i}__meta">
        <span class="${i}__count">${e.sessionCount??0}</span>
        <span>session${(e.sessionCount??0)!==1?"s":""}</span>
      </div>
    `,n.addEventListener("click",()=>{this.selectIndex(t),this.selectProject(e)}),n}escapeHtml(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}projectKey(e,t){return e.id??`project-${t}`}selectIndex(e){if(this.selectedIndex>=0){const t=this.filteredProjects[this.selectedIndex],i=t?this.itemElements.get(this.projectKey(t,this.selectedIndex)):void 0;i&&(i.classList.remove(`${this.options.classPrefix}__item--selected`),i.setAttribute("aria-selected","false"))}if(this.selectedIndex=e,e>=0){const t=this.filteredProjects[e],i=t?this.itemElements.get(this.projectKey(t,e)):void 0;i&&(i.classList.add(`${this.options.classPrefix}__item--selected`),i.setAttribute("aria-selected","true"),i.scrollIntoView({block:"nearest",behavior:"smooth"}))}}selectProject(e){var t,i;(i=(t=this.options).onProjectSelect)==null||i.call(t,e)}getProjects(){return[...this.projects]}getFilteredProjects(){return[...this.filteredProjects]}getSelectedProject(){return this.selectedIndex>=0?this.filteredProjects[this.selectedIndex]??null:null}selectProjectById(e){const t=this.filteredProjects.findIndex(i=>i.id===e);t>=0&&this.selectIndex(t)}refresh(){this.loadProjects(this.currentSourceFilter??void 0)}setSearch(e){this.searchQuery=e.toLowerCase(),this.elements.searchInput&&(this.elements.searchInput.value=e),!this.isLoading&&this.filterProjects()}setSourceFilter(e){const t=e&&e.length>0?e:null;this.currentSourceFilter!==t&&(this.currentSourceFilter=t,this.elements.sourceFilter&&(this.elements.sourceFilter.value=t??""),this.loadProjects(t??void 0))}focusSearch(){var e;(e=this.elements.searchInput)==null||e.focus()}dispose(){if(this.disposed)return;this.boundHandlers.forEach(t=>t()),this.boundHandlers=[],this.itemElements.clear(),this.projects=[],this.filteredProjects=[];const e=this.elements.container.querySelector(`.${this.options.classPrefix}__content`);e&&(e.innerHTML=""),this.disposed=!0}}const st=`
.thinkt-session-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: var(--thinkt-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  color: var(--thinkt-text-color, #e0e0e0);
  background: var(--thinkt-bg-color, #1a1a1a);
}

.thinkt-session-list__header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--thinkt-border-color, #333);
  flex-shrink: 0;
}

.thinkt-session-list__search {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 4px;
  background: var(--thinkt-input-bg, #252525);
  color: inherit;
  font-size: 13px;
  box-sizing: border-box;
}

.thinkt-session-list__search:focus {
  outline: none;
  border-color: var(--thinkt-accent-color, #6366f1);
}

.thinkt-session-list__search::placeholder {
  color: var(--thinkt-muted-color, #666);
}

.thinkt-session-list__stats {
  font-size: 11px;
  color: var(--thinkt-muted-color, #666);
  margin-top: 6px;
}

.thinkt-session-list__content {
  flex: 1;
  overflow-y: auto;
}

.thinkt-session-list__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.thinkt-session-list__item {
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.12s ease;
  border-bottom: 1px solid var(--thinkt-border-color, #252525);
  border-left: 2px solid transparent;
}

.thinkt-session-list__item:hover {
  background: var(--thinkt-hover-bg, #252525);
}

.thinkt-session-list__item--selected {
  background: var(--thinkt-selected-bg, rgba(99, 102, 241, 0.15));
  border-left-color: var(--thinkt-accent-color, #6366f1);
}

.thinkt-session-list__title {
  font-weight: 400;
  font-size: 13px;
  line-height: 1.4;
  margin-bottom: 4px;
  color: var(--thinkt-text-color, #e0e0e0);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.thinkt-session-list__summary {
  font-size: 12px;
  color: var(--thinkt-muted-color, #888);
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.3;
}

.thinkt-session-list__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--thinkt-muted-color, #666);
  flex-wrap: wrap;
}

.thinkt-session-list__meta-item {
  display: flex;
  align-items: center;
  gap: 3px;
}

.thinkt-session-list__meta-icon {
  width: 12px;
  height: 12px;
  opacity: 0.6;
}

.thinkt-session-list__badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.thinkt-session-list__badge--claude {
  background: rgba(217, 119, 80, 0.15);
  color: #d97750;
}

.thinkt-session-list__badge--kimi {
  background: rgba(25, 195, 155, 0.15);
  color: #19c39b;
}

.thinkt-session-list__badge--gemini {
  background: rgba(99, 102, 241, 0.15);
  color: #6366f1;
}

.thinkt-session-list__badge--chunked {
  background: rgba(99, 102, 241, 0.15);
  color: #6366f1;
}

.thinkt-session-list__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--thinkt-muted-color, #888);
}

.thinkt-session-list__empty {
  text-align: center;
  padding: 48px;
  color: var(--thinkt-muted-color, #888);
}

.thinkt-session-list__error {
  padding: 16px;
  margin: 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
}

.thinkt-session-list__retry {
  margin-top: 8px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid currentColor;
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
}

.thinkt-session-list__retry:hover {
  background: rgba(239, 68, 68, 0.2);
}
`;function rt(r){if(!r)return"Unknown";try{const e=r instanceof Date?r:new Date(r),i=new Date().getTime()-e.getTime(),n=Math.floor(i/1e3),s=Math.floor(n/60),a=Math.floor(s/60),o=Math.floor(a/24),c=Math.floor(o/7),l=Math.floor(o/30),d=Math.floor(o/365);return n<60?"just now":s<60?`${s}m ago`:a<24?`${a}h ago`:o<7?`${o}d ago`:c<4?`${c}w ago`:l<12?`${l}mo ago`:`${d}y ago`}catch{return"Invalid"}}function ot(r){return r==null?"0":r>=1e6?(r/1e6).toFixed(1)+"M":r>=1e3?(r/1e3).toFixed(1)+"k":r.toString()}class at{constructor(e){h(this,"elements");h(this,"options");h(this,"client");h(this,"sessions",[]);h(this,"filteredSessions",[]);h(this,"selectedIndex",-1);h(this,"isLoading",!1);h(this,"itemElements",new Map);h(this,"boundHandlers",[]);h(this,"disposed",!1);h(this,"stylesInjected",!1);this.elements=e.elements,this.options={...e,enableSearch:e.enableSearch??!0,classPrefix:e.classPrefix??"thinkt-session-list",dateLocale:e.dateLocale??"en-US",showEntryCount:e.showEntryCount??!0,showFileSize:e.showFileSize??!0,showModel:e.showModel??!0},this.client=e.client??A(),this.init()}async init(){this.injectStyles(),this.createStructure(),this.attachListeners(),this.options.projectId&&await this.loadSessions(this.options.projectId)}injectStyles(){if(this.stylesInjected)return;const e="thinkt-session-list-styles";if(!document.getElementById(e)){const t=document.createElement("style");t.id=e,t.textContent=st,document.head.appendChild(t)}this.stylesInjected=!0}createStructure(){const{container:e}=this.elements,{classPrefix:t}=this.options;e.className=t,e.innerHTML="";const i=document.createElement("div");if(i.className=`${t}__header`,this.options.enableSearch){const o=this.elements.searchInput??document.createElement("input");o.className=`${t}__search`,o.type="text",o.placeholder="Search sessions...",this.elements.searchInput||(this.elements.searchInput=o),i.appendChild(o)}const n=document.createElement("div");n.className=`${t}__stats`,n.textContent=this.options.projectId?"Loading...":"Select a project",i.appendChild(n),e.appendChild(i);const s=document.createElement("div");s.className=`${t}__content`;const a=document.createElement("ul");a.className=`${t}__list`,a.setAttribute("role","listbox"),s.appendChild(a),this.elements.loadingIndicator||(this.elements.loadingIndicator=document.createElement("div"),this.elements.loadingIndicator.className=`${t}__loading`,this.elements.loadingIndicator.textContent="Loading sessions..."),s.appendChild(this.elements.loadingIndicator),this.elements.errorDisplay||(this.elements.errorDisplay=document.createElement("div"),this.elements.errorDisplay.className=`${t}__error`,this.elements.errorDisplay.style.display="none"),s.appendChild(this.elements.errorDisplay),e.appendChild(s)}attachListeners(){const{searchInput:e,container:t}=this.elements;if(e){const n=()=>this.filterSessions();e.addEventListener("input",n),this.boundHandlers.push(()=>e.removeEventListener("input",n))}const i=n=>this.handleKeydown(n);t.addEventListener("keydown",i),this.boundHandlers.push(()=>t.removeEventListener("keydown",i)),t.setAttribute("tabindex","0")}handleKeydown(e){if(this.filteredSessions.length!==0)switch(e.key){case"ArrowDown":e.preventDefault(),this.selectIndex(Math.min(this.selectedIndex+1,this.filteredSessions.length-1));break;case"ArrowUp":e.preventDefault(),this.selectIndex(Math.max(this.selectedIndex-1,0));break;case"Enter":this.selectedIndex>=0&&this.selectSession(this.filteredSessions[this.selectedIndex]);break;case"Home":e.preventDefault(),this.selectIndex(0);break;case"End":e.preventDefault(),this.selectIndex(this.filteredSessions.length-1);break}}async loadSessions(e){var t,i,n,s;if(!this.isLoading){this.options.projectId=e,this.isLoading=!0,this.showLoading(!0),this.showError(null),this.sessions=[],this.filteredSessions=[],this.selectedIndex=-1,this.render();try{this.sessions=await this.client.getSessions(e),this.sessions.sort((a,o)=>{var d,u;const c=((d=a.modifiedAt)==null?void 0:d.getTime())??0;return(((u=o.modifiedAt)==null?void 0:u.getTime())??0)-c}),this.filteredSessions=[...this.sessions],this.render(),Promise.resolve((i=(t=this.options).onSessionsLoaded)==null?void 0:i.call(t,this.sessions))}catch(a){const o=a instanceof Error?a:new Error(String(a));this.showError(o),(s=(n=this.options).onError)==null||s.call(n,o)}finally{this.isLoading=!1,this.showLoading(!1)}}}showLoading(e){this.elements.loadingIndicator&&(this.elements.loadingIndicator.style.display=e?"flex":"none");const t=this.elements.container.querySelector(`.${this.options.classPrefix}__list`);t&&(t.style.display=e?"none":"block")}showError(e){if(this.elements.errorDisplay)if(e){this.elements.errorDisplay.innerHTML="";const t=document.createElement("div");if(t.textContent=e.message,this.elements.errorDisplay.appendChild(t),this.options.projectId){const i=document.createElement("button");i.className=`${this.options.classPrefix}__retry`,i.textContent="Retry",i.addEventListener("click",()=>{this.options.projectId&&this.loadSessions(this.options.projectId)}),this.elements.errorDisplay.appendChild(i)}this.elements.errorDisplay.style.display="block"}else this.elements.errorDisplay.style.display="none"}filterSessions(){var t;const e=((t=this.elements.searchInput)==null?void 0:t.value.toLowerCase())??"";this.filteredSessions=this.sessions.filter(i=>e?[i.id,i.summary,i.firstPrompt,i.model,i.gitBranch].some(s=>s==null?void 0:s.toLowerCase().includes(e)):!0),this.selectedIndex=-1,this.render()}render(){this.updateStats(),this.renderList()}updateStats(){const e=this.elements.container.querySelector(`.${this.options.classPrefix}__stats`);if(e)if(!this.options.projectId)e.textContent="Select a project to view sessions";else if(this.isLoading)e.textContent="Loading sessions...";else{const t=this.sessions.length,i=this.filteredSessions.length;i===t?e.textContent=`${t} session${t!==1?"s":""}`:e.textContent=`Showing ${i} of ${t} sessions`}}renderList(){var i,n;const e=this.elements.container.querySelector("ul");if(!e)return;if(e.innerHTML="",this.itemElements.clear(),this.elements.container.querySelectorAll(`.${this.options.classPrefix}__empty`).forEach(s=>s.remove()),!this.options.projectId){const s=document.createElement("div");s.className=`${this.options.classPrefix}__empty`,s.textContent="Select a project to view its sessions",(i=e.parentElement)==null||i.appendChild(s);return}if(this.filteredSessions.length===0){const s=document.createElement("div");s.className=`${this.options.classPrefix}__empty`,s.textContent=this.sessions.length===0?"No sessions found for this project":"No sessions match your search",(n=e.parentElement)==null||n.appendChild(s);return}for(let s=0;s<this.filteredSessions.length;s++){const a=this.filteredSessions[s],o=this.renderSessionItem(a,s);e.appendChild(o),this.itemElements.set(this.sessionKey(a,s),o)}}renderSessionItem(e,t){if(this.options.sessionRenderer)return this.options.sessionRenderer(e,t);const{classPrefix:i,showEntryCount:n,showModel:s}=this.options,a=document.createElement("li");a.className=`${i}__item`,a.setAttribute("role","option"),a.setAttribute("aria-selected","false"),a.dataset.index=String(t),a.dataset.sessionId=e.id;const o=e.source??"claude",c=(e.chunkCount??0)>1,l=e.firstPrompt?e.firstPrompt.slice(0,80)+(e.firstPrompt.length>80?"...":""):e.id??"Unknown Session",d=[];if(d.push(`<span class="${i}__meta-item">${rt(e.modifiedAt)}</span>`),n&&e.entryCount!==void 0&&d.push(`<span class="${i}__meta-item">${ot(e.entryCount)} msgs</span>`),s&&e.model){const u=e.model.replace(/^(claude-|gpt-|gemini-)/,"");d.push(`<span class="${i}__meta-item">${u}</span>`)}return o!=="claude"&&d.push(`<span class="${i}__badge ${i}__badge--${o}">${o}</span>`),c&&d.push(`<span class="${i}__badge ${i}__badge--chunked">chunked</span>`),a.innerHTML=`
      <div class="${i}__title">${this.escapeHtml(l)}</div>
      ${e.summary?`<div class="${i}__summary">${this.escapeHtml(e.summary)}</div>`:""}
      <div class="${i}__meta">${d.join("")}</div>
    `,a.addEventListener("click",()=>{this.selectIndex(t),this.selectSession(e)}),a}escapeHtml(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}sessionKey(e,t){return e.id??`session-${t}`}selectIndex(e){if(this.selectedIndex>=0){const t=this.filteredSessions[this.selectedIndex],i=t?this.itemElements.get(this.sessionKey(t,this.selectedIndex)):void 0;i&&(i.classList.remove(`${this.options.classPrefix}__item--selected`),i.setAttribute("aria-selected","false"))}if(this.selectedIndex=e,e>=0){const t=this.filteredSessions[e],i=t?this.itemElements.get(this.sessionKey(t,e)):void 0;i&&(i.classList.add(`${this.options.classPrefix}__item--selected`),i.setAttribute("aria-selected","true"),i.scrollIntoView({block:"nearest",behavior:"smooth"}))}}selectSession(e){const t=this.options.onSessionSelect;if(t)try{t(e)}catch(i){console.error("Session selection handler error:",i)}}getSessions(){return[...this.sessions]}getFilteredSessions(){return[...this.filteredSessions]}getSelectedSession(){return this.selectedIndex>=0?this.filteredSessions[this.selectedIndex]??null:null}selectSessionById(e){const t=this.filteredSessions.findIndex(i=>i.id===e);t>=0&&this.selectIndex(t)}refresh(){return this.options.projectId?this.loadSessions(this.options.projectId):Promise.resolve()}setSearch(e){this.elements.searchInput&&(this.elements.searchInput.value=e,this.filterSessions())}setProjectId(e){return this.loadSessions(e)}focusSearch(){var e;(e=this.elements.searchInput)==null||e.focus()}dispose(){this.disposed||(this.boundHandlers.forEach(e=>e()),this.boundHandlers=[],this.itemElements.clear(),this.sessions=[],this.filteredSessions=[],this.elements.container.innerHTML="",this.disposed=!0)}}const lt=`
/* ============================================
   Layout
   ============================================ */

.thinkt-conversation-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  font-family: var(--thinkt-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  font-size: 13px;
  line-height: 1.6;
  color: var(--thinkt-text-color, #e0e0e0);
  background: var(--thinkt-bg-color, #0a0a0a);
}

/* ============================================
   Filter Bar
   ============================================ */

.thinkt-conversation-view__filters {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--thinkt-border-color, #2a2a2a);
  background: rgba(255, 255, 255, 0.02);
  overflow-x: auto;
  flex-shrink: 0;
}

.thinkt-conversation-view__filter-label {
  font-size: 11px;
  color: var(--thinkt-muted-color, #666);
  margin-right: 4px;
  white-space: nowrap;
}

.thinkt-conversation-view__filter-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--thinkt-muted-color, #888);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.thinkt-conversation-view__filter-btn:hover {
  border-color: var(--thinkt-border-color-light, #444);
  color: var(--thinkt-text-color, #e0e0e0);
}

.thinkt-conversation-view__filter-btn.active {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.4);
  color: #6366f1;
}

.thinkt-conversation-view__filter-btn.active[data-filter="assistant"] {
  background: rgba(217, 119, 80, 0.15);
  border-color: rgba(217, 119, 80, 0.4);
  color: #d97750;
}

.thinkt-conversation-view__filter-btn.active[data-filter="thinking"] {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.4);
  color: #6366f1;
}

.thinkt-conversation-view__filter-btn.active[data-filter="toolUse"] {
  background: rgba(25, 195, 155, 0.15);
  border-color: rgba(25, 195, 155, 0.4);
  color: #19c39b;
}

.thinkt-conversation-view__filter-btn.active[data-filter="toolResult"] {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.4);
  color: #22c55e;
}

.thinkt-conversation-view__filter-btn.active[data-filter="system"] {
  background: rgba(136, 136, 136, 0.15);
  border-color: rgba(136, 136, 136, 0.4);
  color: #888;
}

/* ============================================
   Content Area
   ============================================ */

.thinkt-conversation-view__content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* ============================================
   Entry Cards
   ============================================ */

.thinkt-conversation-entry {
  margin-bottom: 16px;
  border-radius: 8px;
  border: 1px solid var(--thinkt-border-color, #2a2a2a);
  background: var(--thinkt-bg-secondary, #141414);
  overflow: hidden;
}

.thinkt-conversation-entry.hidden {
  display: none;
}

.thinkt-conversation-entry--highlighted {
  animation: thinkt-highlight-pulse 2s ease;
}

@keyframes thinkt-highlight-pulse {
  0%, 100% {
    border-color: var(--thinkt-border-color, #2a2a2a);
    box-shadow: none;
  }
  20%, 80% {
    border-color: var(--thinkt-accent-color, #6366f1);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
  }
}

.thinkt-conversation-entry__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid var(--thinkt-border-color, #2a2a2a);
}

.thinkt-conversation-entry__role {
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.thinkt-conversation-entry__role--user { color: #6366f1; }
.thinkt-conversation-entry__role--assistant { color: #d97750; }
.thinkt-conversation-entry__role--system { color: #888; }
.thinkt-conversation-entry__role--tool { color: #19c39b; }

.thinkt-conversation-entry__timestamp {
  margin-left: auto;
  font-size: 11px;
  color: var(--thinkt-muted-color, #666);
}

.thinkt-conversation-entry__content {
  padding: 12px;
}

/* ============================================
   Text Blocks
   ============================================ */

.thinkt-conversation-entry__text {
  white-space: pre-wrap;
  word-break: break-word;
  position: relative;
}

/* ============================================
   Markdown Rendering
   ============================================ */

.thinkt-conversation-entry__text--markdown {
  white-space: normal;
}

.thinkt-conversation-entry__text--markdown h1,
.thinkt-conversation-entry__text--markdown h2,
.thinkt-conversation-entry__text--markdown h3,
.thinkt-conversation-entry__text--markdown h4,
.thinkt-conversation-entry__text--markdown h5,
.thinkt-conversation-entry__text--markdown h6 {
  margin: 1em 0 0.5em;
  line-height: 1.3;
  color: var(--thinkt-text-color, #e0e0e0);
}

.thinkt-conversation-entry__text--markdown h1:first-child,
.thinkt-conversation-entry__text--markdown h2:first-child,
.thinkt-conversation-entry__text--markdown h3:first-child {
  margin-top: 0;
}

.thinkt-conversation-entry__text--markdown h1 { font-size: 1.4em; }
.thinkt-conversation-entry__text--markdown h2 { font-size: 1.2em; }
.thinkt-conversation-entry__text--markdown h3 { font-size: 1.1em; }

.thinkt-conversation-entry__text--markdown p {
  margin: 0.5em 0;
}

.thinkt-conversation-entry__text--markdown p:first-child {
  margin-top: 0;
}

.thinkt-conversation-entry__text--markdown p:last-child {
  margin-bottom: 0;
}

.thinkt-conversation-entry__text--markdown ul,
.thinkt-conversation-entry__text--markdown ol {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.thinkt-conversation-entry__text--markdown li {
  margin: 0.2em 0;
}

.thinkt-conversation-entry__text--markdown blockquote {
  margin: 0.5em 0;
  padding: 0.5em 1em;
  border-left: 3px solid var(--thinkt-border-color, #444);
  color: var(--thinkt-muted-color, #aaa);
  background: rgba(255, 255, 255, 0.02);
}

.thinkt-conversation-entry__text--markdown a {
  color: #6366f1;
  text-decoration: none;
}

.thinkt-conversation-entry__text--markdown a:hover {
  text-decoration: underline;
}

.thinkt-conversation-entry__text--markdown code {
  font-family: var(--thinkt-font-mono, 'SF Mono', Monaco, monospace);
  font-size: 0.9em;
  padding: 0.15em 0.4em;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
}

.thinkt-conversation-entry__text--markdown table {
  border-collapse: collapse;
  margin: 0.5em 0;
  width: 100%;
}

.thinkt-conversation-entry__text--markdown th,
.thinkt-conversation-entry__text--markdown td {
  border: 1px solid var(--thinkt-border-color, #333);
  padding: 6px 10px;
  text-align: left;
}

.thinkt-conversation-entry__text--markdown th {
  background: rgba(255, 255, 255, 0.05);
  font-weight: 600;
}

.thinkt-conversation-entry__text--markdown hr {
  border: none;
  border-top: 1px solid var(--thinkt-border-color, #333);
  margin: 1em 0;
}

.thinkt-conversation-entry__text--markdown img {
  max-width: 100%;
}

/* Code blocks from markdown */
.thinkt-code-block {
  margin: 0.5em 0;
  border-radius: 6px;
  border: 1px solid var(--thinkt-border-color, #2a2a2a);
  overflow: hidden;
}

.thinkt-code-block__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid var(--thinkt-border-color, #2a2a2a);
  font-size: 11px;
}

.thinkt-code-block__lang {
  color: var(--thinkt-muted-color, #888);
  text-transform: lowercase;
}

.thinkt-code-block pre {
  margin: 0;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.3);
  overflow-x: auto;
  font-family: var(--thinkt-font-mono, 'SF Mono', Monaco, monospace);
  font-size: 12px;
  line-height: 1.5;
}

.thinkt-code-block pre code {
  padding: 0;
  background: none;
  border-radius: 0;
  font-size: inherit;
}

/* ============================================
   Standalone Block Wrappers
   ============================================ */

.thinkt-standalone-block {
  margin-bottom: 8px;
}

.thinkt-standalone-block.hidden {
  display: none;
}

/* Remove inner margin when block is standalone (not nested in a card) */
.thinkt-standalone-block > .thinkt-thinking-block,
.thinkt-standalone-block > .thinkt-tool-call,
.thinkt-standalone-block > .thinkt-conversation-entry__tool-result {
  margin-top: 0;
}

/* ============================================
   Thinking Blocks (collapsible)
   ============================================ */

.thinkt-thinking-block {
  margin-top: 12px;
  border-radius: 4px;
  background: rgba(99, 102, 241, 0.08);
  border-left: 3px solid #6366f1;
  overflow: hidden;
}

.thinkt-thinking-block.hidden {
  display: none;
}

.thinkt-thinking-block__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
  transition: background 0.12s ease;
}

.thinkt-thinking-block__header:hover {
  background: rgba(99, 102, 241, 0.06);
}

.thinkt-thinking-block__toggle {
  font-size: 10px;
  color: #6366f1;
  transition: transform 0.15s ease;
  flex-shrink: 0;
}

.thinkt-thinking-block.expanded .thinkt-thinking-block__toggle {
  transform: rotate(90deg);
}

.thinkt-thinking-block__label {
  font-size: 11px;
  font-weight: 600;
  color: #6366f1;
  flex-shrink: 0;
}

.thinkt-thinking-block__duration {
  font-size: 10px;
  color: #a5a6f3;
  flex-shrink: 0;
}

.thinkt-thinking-block__preview {
  font-size: 11px;
  color: #a5a6f3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-style: italic;
  flex: 1;
  min-width: 0;
}

.thinkt-thinking-block__content {
  display: none;
  padding: 8px 12px;
  font-style: italic;
  color: #a5a6f3;
  white-space: pre-wrap;
  word-break: break-word;
  border-top: 1px solid rgba(99, 102, 241, 0.15);
  max-height: 400px;
  overflow-y: auto;
}

.thinkt-thinking-block.expanded .thinkt-thinking-block__content {
  display: block;
}

/* ============================================
   Tool Use Blocks (compact with inline status)
   ============================================ */

.thinkt-tool-call {
  margin-top: 8px;
  border-radius: 4px;
  background: rgba(25, 195, 155, 0.06);
  border-left: 3px solid #19c39b;
  overflow: hidden;
}

.thinkt-tool-call.hidden {
  display: none;
}

.thinkt-tool-call__summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  cursor: pointer;
  user-select: none;
  font-size: 12px;
  transition: background 0.12s ease;
}

.thinkt-tool-call__summary:hover {
  background: rgba(25, 195, 155, 0.06);
}

.thinkt-tool-call__toggle {
  font-size: 10px;
  color: #19c39b;
  transition: transform 0.15s ease;
  flex-shrink: 0;
}

.thinkt-tool-call.expanded .thinkt-tool-call__toggle {
  transform: rotate(90deg);
}

.thinkt-tool-call__bullet {
  color: var(--thinkt-muted-color, #666);
}

.thinkt-tool-call__name {
  font-weight: 600;
  color: #19c39b;
}

.thinkt-tool-call__arg {
  color: var(--thinkt-muted-color, #999);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  font-family: var(--thinkt-font-mono, 'SF Mono', Monaco, monospace);
  font-size: 11px;
}

.thinkt-tool-call__status {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 12px;
}

.thinkt-tool-call__status--ok { color: #22c55e; }
.thinkt-tool-call__status--error { color: #ef4444; }
.thinkt-tool-call__status--pending { color: var(--thinkt-muted-color, #666); }

.thinkt-tool-call__duration {
  font-size: 10px;
  color: var(--thinkt-muted-color, #666);
  flex-shrink: 0;
}

.thinkt-tool-call__detail {
  display: none;
  border-top: 1px solid rgba(25, 195, 155, 0.15);
}

.thinkt-tool-call.expanded .thinkt-tool-call__detail {
  display: block;
}

.thinkt-tool-call__detail-section {
  padding: 8px 12px;
}

.thinkt-tool-call__detail-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
  color: var(--thinkt-muted-color, #888);
}

.thinkt-tool-call__detail-content {
  font-family: var(--thinkt-font-mono, 'SF Mono', Monaco, monospace);
  font-size: 11px;
  background: rgba(0, 0, 0, 0.3);
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
  position: relative;
}

.thinkt-tool-call__detail-result {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid rgba(25, 195, 155, 0.1);
}

.thinkt-tool-call__detail-result--error .thinkt-tool-call__detail-label {
  color: #ef4444;
}

/* ============================================
   Standalone Tool Result Blocks
   ============================================ */

.thinkt-conversation-entry__tool-result {
  margin-top: 12px;
  padding: 10px 12px;
  background: rgba(34, 197, 94, 0.1);
  border-left: 3px solid #22c55e;
  border-radius: 0 4px 4px 0;
}

.thinkt-conversation-entry__tool-result.hidden {
  display: none;
}

.thinkt-conversation-entry__tool-result-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  color: #22c55e;
}

.thinkt-conversation-entry__tool-result--error {
  background: rgba(239, 68, 68, 0.1);
  border-left-color: #ef4444;
}

.thinkt-conversation-entry__tool-result--error .thinkt-conversation-entry__tool-result-label {
  color: #ef4444;
}

/* ============================================
   Copy Buttons
   ============================================ */

.thinkt-copy-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--thinkt-muted-color, #888);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.thinkt-copy-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--thinkt-text-color, #e0e0e0);
}

.thinkt-copy-btn--float {
  position: absolute;
  top: 0;
  right: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.thinkt-conversation-entry__text:hover .thinkt-copy-btn--float,
.thinkt-tool-call__detail-content:hover .thinkt-copy-btn--float {
  opacity: 1;
}

/* ============================================
   Empty State
   ============================================ */

.thinkt-conversation-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--thinkt-muted-color, #666);
  text-align: center;
  padding: 48px;
}

.thinkt-conversation-empty__icon {
  font-size: 40px;
  margin-bottom: 12px;
  opacity: 0.4;
}

.thinkt-conversation-empty__title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--thinkt-text-color, #e0e0e0);
}

/* ============================================
   Toolbar
   ============================================ */

.thinkt-conversation-view__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--thinkt-border-color, #2a2a2a);
  background: rgba(255, 255, 255, 0.02);
  flex-shrink: 0;
}

.thinkt-conversation-view__toolbar-path {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.thinkt-conversation-view__toolbar-path-icon {
  font-size: 14px;
  color: var(--thinkt-muted-color, #666);
  flex-shrink: 0;
}

.thinkt-conversation-view__toolbar-path-text {
  font-size: 13px;
  color: var(--thinkt-text-color, #e0e0e0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--thinkt-font-mono, 'SF Mono', Monaco, monospace);
}

.thinkt-conversation-view__toolbar-path-actions {
  display: flex;
  align-items: center;
  margin-left: 4px;
}

.thinkt-conversation-view__toolbar-metrics {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  color: var(--thinkt-muted-color, #888);
  margin-left: auto;
}

.thinkt-conversation-view__toolbar-actions {
  position: relative;
  flex-shrink: 0;
}

.thinkt-conversation-view__toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 6px;
  color: var(--thinkt-text-color, #e0e0e0);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.thinkt-conversation-view__toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--thinkt-border-color-light, #444);
}

.thinkt-conversation-view__toolbar-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.thinkt-conversation-view__toolbar-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 160px;
  background: var(--thinkt-bg-secondary, #141414);
  border: 1px solid var(--thinkt-border-color, #2a2a2a);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  display: none;
  overflow: hidden;
}

.thinkt-conversation-view__toolbar-dropdown.open {
  display: block;
}

.thinkt-conversation-view__toolbar-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--thinkt-text-color, #e0e0e0);
  cursor: pointer;
  transition: background 0.12s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.thinkt-conversation-view__toolbar-dropdown-item:last-child {
  border-bottom: none;
}

.thinkt-conversation-view__toolbar-dropdown-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

/* ============================================
   Export Dropdown (in filter bar)
   ============================================ */

.thinkt-conversation-view__export {
  position: relative;
  margin-left: auto;
  flex-shrink: 0;
}

.thinkt-conversation-view__export-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 4px;
  color: var(--thinkt-muted-color, #888);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.thinkt-conversation-view__export-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--thinkt-border-color-light, #444);
  color: var(--thinkt-text-color, #e0e0e0);
}

.thinkt-conversation-view__export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.thinkt-conversation-view__export-dropdown {
  position: fixed;
  min-width: 140px;
  background: var(--thinkt-bg-secondary, #141414);
  border: 1px solid var(--thinkt-border-color, #2a2a2a);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 10000;
  display: none;
  overflow: hidden;
}

.thinkt-conversation-view__export-dropdown.open {
  display: block;
}

.thinkt-conversation-view__export-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--thinkt-text-color, #e0e0e0);
  cursor: pointer;
  transition: background 0.12s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.thinkt-conversation-view__export-dropdown-item:last-child {
  border-bottom: none;
}

.thinkt-conversation-view__export-dropdown-item:hover {
  background: rgba(255, 255, 255, 0.05);
}
`;function re(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}var $=re();function $e(r){$=r}var F={exec:()=>null};function x(r,e=""){let t=typeof r=="string"?r:r.source,i={replace:(n,s)=>{let a=typeof s=="string"?s:s.source;return a=a.replace(S.caret,"$1"),t=t.replace(n,a),i},getRegex:()=>new RegExp(t,e)};return i}var ct=(()=>{try{return!!new RegExp("(?<=1)(?<!1)")}catch{return!1}})(),S={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceTabs:/^\t+/,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] +\S/,listReplaceTask:/^\[[ xX]\] +/,listTaskCheckbox:/\[[ xX]\]/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,unescapeTest:/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:r=>new RegExp(`^( {0,3}${r})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:r=>new RegExp(`^ {0,${Math.min(3,r-1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),hrRegex:r=>new RegExp(`^ {0,${Math.min(3,r-1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),fencesBeginRegex:r=>new RegExp(`^ {0,${Math.min(3,r-1)}}(?:\`\`\`|~~~)`),headingBeginRegex:r=>new RegExp(`^ {0,${Math.min(3,r-1)}}#`),htmlBeginRegex:r=>new RegExp(`^ {0,${Math.min(3,r-1)}}<(?:[a-z].*>|!--)`,"i")},ht=/^(?:[ \t]*(?:\n|$))+/,dt=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,pt=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,U=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,ut=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,oe=/(?:[*+-]|\d{1,9}[.)])/,Ie=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,Re=x(Ie).replace(/bull/g,oe).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),mt=x(Ie).replace(/bull/g,oe).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),ae=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,gt=/^[^\n]+/,le=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/,ft=x(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",le).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),kt=x(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g,oe).getRegex(),Y="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",ce=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,bt=x("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",ce).replace("tag",Y).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),ze=x(ae).replace("hr",U).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",Y).getRegex(),xt=x(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",ze).getRegex(),he={blockquote:xt,code:dt,def:ft,fences:pt,heading:ut,hr:U,html:bt,lheading:Re,list:kt,newline:ht,paragraph:ze,table:F,text:gt},xe=x("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",U).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",Y).getRegex(),vt={...he,lheading:mt,table:xe,paragraph:x(ae).replace("hr",U).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",xe).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",Y).getRegex()},wt={...he,html:x(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment",ce).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:F,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:x(ae).replace("hr",U).replace("heading",` *#{1,6} *[^
]`).replace("lheading",Re).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},yt=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,_t=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,Me=/^( {2,}|\\)\n(?!\s*$)/,St=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,Q=/[\p{P}\p{S}]/u,de=/[\s\p{P}\p{S}]/u,He=/[^\s\p{P}\p{S}]/u,Tt=x(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,de).getRegex(),Be=/(?!~)[\p{P}\p{S}]/u,jt=/(?!~)[\s\p{P}\p{S}]/u,Et=/(?:[^\s\p{P}\p{S}]|~)/u,Pt=x(/link|precode-code|html/,"g").replace("link",/\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-",ct?"(?<!`)()":"(^^|[^`])").replace("code",/(?<b>`+)[^`]+\k<b>(?!`)/).replace("html",/<(?! )[^<>]*?>/).getRegex(),Ne=/^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/,Ct=x(Ne,"u").replace(/punct/g,Q).getRegex(),Lt=x(Ne,"u").replace(/punct/g,Be).getRegex(),De="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",At=x(De,"gu").replace(/notPunctSpace/g,He).replace(/punctSpace/g,de).replace(/punct/g,Q).getRegex(),$t=x(De,"gu").replace(/notPunctSpace/g,Et).replace(/punctSpace/g,jt).replace(/punct/g,Be).getRegex(),It=x("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,He).replace(/punctSpace/g,de).replace(/punct/g,Q).getRegex(),Rt=x(/\\(punct)/,"gu").replace(/punct/g,Q).getRegex(),zt=x(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),Mt=x(ce).replace("(?:-->|$)","-->").getRegex(),Ht=x("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",Mt).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),Z=/(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+[^`]*?`+(?!`)|[^\[\]\\`])*?/,Bt=x(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label",Z).replace("href",/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),Fe=x(/^!?\[(label)\]\[(ref)\]/).replace("label",Z).replace("ref",le).getRegex(),Ue=x(/^!?\[(ref)\](?:\[\])?/).replace("ref",le).getRegex(),Nt=x("reflink|nolink(?!\\()","g").replace("reflink",Fe).replace("nolink",Ue).getRegex(),ve=/[hH][tT][tT][pP][sS]?|[fF][tT][pP]/,pe={_backpedal:F,anyPunctuation:Rt,autolink:zt,blockSkip:Pt,br:Me,code:_t,del:F,emStrongLDelim:Ct,emStrongRDelimAst:At,emStrongRDelimUnd:It,escape:yt,link:Bt,nolink:Ue,punctuation:Tt,reflink:Fe,reflinkSearch:Nt,tag:Ht,text:St,url:F},Dt={...pe,link:x(/^!?\[(label)\]\((.*?)\)/).replace("label",Z).getRegex(),reflink:x(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",Z).getRegex()},ee={...pe,emStrongRDelimAst:$t,emStrongLDelim:Lt,url:x(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol",ve).replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,text:x(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol",ve).getRegex()},Ft={...ee,br:x(Me).replace("{2,}","*").getRegex(),text:x(ee.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},V={normal:he,gfm:vt,pedantic:wt},B={normal:pe,gfm:ee,breaks:Ft,pedantic:Dt},Ut={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},we=r=>Ut[r];function P(r,e){if(e){if(S.escapeTest.test(r))return r.replace(S.escapeReplace,we)}else if(S.escapeTestNoEncode.test(r))return r.replace(S.escapeReplaceNoEncode,we);return r}function ye(r){try{r=encodeURI(r).replace(S.percentDecode,"%")}catch{return null}return r}function _e(r,e){var s;let t=r.replace(S.findPipe,(a,o,c)=>{let l=!1,d=o;for(;--d>=0&&c[d]==="\\";)l=!l;return l?"|":" |"}),i=t.split(S.splitPipe),n=0;if(i[0].trim()||i.shift(),i.length>0&&!((s=i.at(-1))!=null&&s.trim())&&i.pop(),e)if(i.length>e)i.splice(e);else for(;i.length<e;)i.push("");for(;n<i.length;n++)i[n]=i[n].trim().replace(S.slashPipe,"|");return i}function N(r,e,t){let i=r.length;if(i===0)return"";let n=0;for(;n<i&&r.charAt(i-n-1)===e;)n++;return r.slice(0,i-n)}function qt(r,e){if(r.indexOf(e[1])===-1)return-1;let t=0;for(let i=0;i<r.length;i++)if(r[i]==="\\")i++;else if(r[i]===e[0])t++;else if(r[i]===e[1]&&(t--,t<0))return i;return t>0?-2:-1}function Se(r,e,t,i,n){let s=e.href,a=e.title||null,o=r[1].replace(n.other.outputLinkReplace,"$1");i.state.inLink=!0;let c={type:r[0].charAt(0)==="!"?"image":"link",raw:t,href:s,title:a,text:o,tokens:i.inlineTokens(o)};return i.state.inLink=!1,c}function Vt(r,e,t){let i=r.match(t.other.indentCodeCompensation);if(i===null)return e;let n=i[1];return e.split(`
`).map(s=>{let a=s.match(t.other.beginningSpace);if(a===null)return s;let[o]=a;return o.length>=n.length?s.slice(n.length):s}).join(`
`)}var G=class{constructor(r){h(this,"options");h(this,"rules");h(this,"lexer");this.options=r||$}space(r){let e=this.rules.block.newline.exec(r);if(e&&e[0].length>0)return{type:"space",raw:e[0]}}code(r){let e=this.rules.block.code.exec(r);if(e){let t=e[0].replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:e[0],codeBlockStyle:"indented",text:this.options.pedantic?t:N(t,`
`)}}}fences(r){let e=this.rules.block.fences.exec(r);if(e){let t=e[0],i=Vt(t,e[3]||"",this.rules);return{type:"code",raw:t,lang:e[2]?e[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):e[2],text:i}}}heading(r){let e=this.rules.block.heading.exec(r);if(e){let t=e[2].trim();if(this.rules.other.endingHash.test(t)){let i=N(t,"#");(this.options.pedantic||!i||this.rules.other.endingSpaceChar.test(i))&&(t=i.trim())}return{type:"heading",raw:e[0],depth:e[1].length,text:t,tokens:this.lexer.inline(t)}}}hr(r){let e=this.rules.block.hr.exec(r);if(e)return{type:"hr",raw:N(e[0],`
`)}}blockquote(r){let e=this.rules.block.blockquote.exec(r);if(e){let t=N(e[0],`
`).split(`
`),i="",n="",s=[];for(;t.length>0;){let a=!1,o=[],c;for(c=0;c<t.length;c++)if(this.rules.other.blockquoteStart.test(t[c]))o.push(t[c]),a=!0;else if(!a)o.push(t[c]);else break;t=t.slice(c);let l=o.join(`
`),d=l.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");i=i?`${i}
${l}`:l,n=n?`${n}
${d}`:d;let u=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(d,s,!0),this.lexer.state.top=u,t.length===0)break;let m=s.at(-1);if((m==null?void 0:m.type)==="code")break;if((m==null?void 0:m.type)==="blockquote"){let p=m,g=p.raw+`
`+t.join(`
`),f=this.blockquote(g);s[s.length-1]=f,i=i.substring(0,i.length-p.raw.length)+f.raw,n=n.substring(0,n.length-p.text.length)+f.text;break}else if((m==null?void 0:m.type)==="list"){let p=m,g=p.raw+`
`+t.join(`
`),f=this.list(g);s[s.length-1]=f,i=i.substring(0,i.length-m.raw.length)+f.raw,n=n.substring(0,n.length-p.raw.length)+f.raw,t=g.substring(s.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:i,tokens:s,text:n}}}list(r){var t,i;let e=this.rules.block.list.exec(r);if(e){let n=e[1].trim(),s=n.length>1,a={type:"list",raw:"",ordered:s,start:s?+n.slice(0,-1):"",loose:!1,items:[]};n=s?`\\d{1,9}\\${n.slice(-1)}`:`\\${n}`,this.options.pedantic&&(n=s?n:"[*+-]");let o=this.rules.other.listItemRegex(n),c=!1;for(;r;){let d=!1,u="",m="";if(!(e=o.exec(r))||this.rules.block.hr.test(r))break;u=e[0],r=r.substring(u.length);let p=e[2].split(`
`,1)[0].replace(this.rules.other.listReplaceTabs,y=>" ".repeat(3*y.length)),g=r.split(`
`,1)[0],f=!p.trim(),k=0;if(this.options.pedantic?(k=2,m=p.trimStart()):f?k=e[1].length+1:(k=e[2].search(this.rules.other.nonSpaceChar),k=k>4?1:k,m=p.slice(k),k+=e[1].length),f&&this.rules.other.blankLine.test(g)&&(u+=g+`
`,r=r.substring(g.length+1),d=!0),!d){let y=this.rules.other.nextBulletRegex(k),_=this.rules.other.hrRegex(k),I=this.rules.other.fencesBeginRegex(k),q=this.rules.other.headingBeginRegex(k),Ke=this.rules.other.htmlBeginRegex(k);for(;r;){let J=r.split(`
`,1)[0],H;if(g=J,this.options.pedantic?(g=g.replace(this.rules.other.listReplaceNesting,"  "),H=g):H=g.replace(this.rules.other.tabCharGlobal,"    "),I.test(g)||q.test(g)||Ke.test(g)||y.test(g)||_.test(g))break;if(H.search(this.rules.other.nonSpaceChar)>=k||!g.trim())m+=`
`+H.slice(k);else{if(f||p.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||I.test(p)||q.test(p)||_.test(p))break;m+=`
`+g}!f&&!g.trim()&&(f=!0),u+=J+`
`,r=r.substring(J.length+1),p=H.slice(k)}}a.loose||(c?a.loose=!0:this.rules.other.doubleBlankLine.test(u)&&(c=!0)),a.items.push({type:"list_item",raw:u,task:!!this.options.gfm&&this.rules.other.listIsTask.test(m),loose:!1,text:m,tokens:[]}),a.raw+=u}let l=a.items.at(-1);if(l)l.raw=l.raw.trimEnd(),l.text=l.text.trimEnd();else return;a.raw=a.raw.trimEnd();for(let d of a.items){if(this.lexer.state.top=!1,d.tokens=this.lexer.blockTokens(d.text,[]),d.task){if(d.text=d.text.replace(this.rules.other.listReplaceTask,""),((t=d.tokens[0])==null?void 0:t.type)==="text"||((i=d.tokens[0])==null?void 0:i.type)==="paragraph"){d.tokens[0].raw=d.tokens[0].raw.replace(this.rules.other.listReplaceTask,""),d.tokens[0].text=d.tokens[0].text.replace(this.rules.other.listReplaceTask,"");for(let m=this.lexer.inlineQueue.length-1;m>=0;m--)if(this.rules.other.listIsTask.test(this.lexer.inlineQueue[m].src)){this.lexer.inlineQueue[m].src=this.lexer.inlineQueue[m].src.replace(this.rules.other.listReplaceTask,"");break}}let u=this.rules.other.listTaskCheckbox.exec(d.raw);if(u){let m={type:"checkbox",raw:u[0]+" ",checked:u[0]!=="[ ]"};d.checked=m.checked,a.loose?d.tokens[0]&&["paragraph","text"].includes(d.tokens[0].type)&&"tokens"in d.tokens[0]&&d.tokens[0].tokens?(d.tokens[0].raw=m.raw+d.tokens[0].raw,d.tokens[0].text=m.raw+d.tokens[0].text,d.tokens[0].tokens.unshift(m)):d.tokens.unshift({type:"paragraph",raw:m.raw,text:m.raw,tokens:[m]}):d.tokens.unshift(m)}}if(!a.loose){let u=d.tokens.filter(p=>p.type==="space"),m=u.length>0&&u.some(p=>this.rules.other.anyLine.test(p.raw));a.loose=m}}if(a.loose)for(let d of a.items){d.loose=!0;for(let u of d.tokens)u.type==="text"&&(u.type="paragraph")}return a}}html(r){let e=this.rules.block.html.exec(r);if(e)return{type:"html",block:!0,raw:e[0],pre:e[1]==="pre"||e[1]==="script"||e[1]==="style",text:e[0]}}def(r){let e=this.rules.block.def.exec(r);if(e){let t=e[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal," "),i=e[2]?e[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",n=e[3]?e[3].substring(1,e[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):e[3];return{type:"def",tag:t,raw:e[0],href:i,title:n}}}table(r){var a;let e=this.rules.block.table.exec(r);if(!e||!this.rules.other.tableDelimiter.test(e[2]))return;let t=_e(e[1]),i=e[2].replace(this.rules.other.tableAlignChars,"").split("|"),n=(a=e[3])!=null&&a.trim()?e[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],s={type:"table",raw:e[0],header:[],align:[],rows:[]};if(t.length===i.length){for(let o of i)this.rules.other.tableAlignRight.test(o)?s.align.push("right"):this.rules.other.tableAlignCenter.test(o)?s.align.push("center"):this.rules.other.tableAlignLeft.test(o)?s.align.push("left"):s.align.push(null);for(let o=0;o<t.length;o++)s.header.push({text:t[o],tokens:this.lexer.inline(t[o]),header:!0,align:s.align[o]});for(let o of n)s.rows.push(_e(o,s.header.length).map((c,l)=>({text:c,tokens:this.lexer.inline(c),header:!1,align:s.align[l]})));return s}}lheading(r){let e=this.rules.block.lheading.exec(r);if(e)return{type:"heading",raw:e[0],depth:e[2].charAt(0)==="="?1:2,text:e[1],tokens:this.lexer.inline(e[1])}}paragraph(r){let e=this.rules.block.paragraph.exec(r);if(e){let t=e[1].charAt(e[1].length-1)===`
`?e[1].slice(0,-1):e[1];return{type:"paragraph",raw:e[0],text:t,tokens:this.lexer.inline(t)}}}text(r){let e=this.rules.block.text.exec(r);if(e)return{type:"text",raw:e[0],text:e[0],tokens:this.lexer.inline(e[0])}}escape(r){let e=this.rules.inline.escape.exec(r);if(e)return{type:"escape",raw:e[0],text:e[1]}}tag(r){let e=this.rules.inline.tag.exec(r);if(e)return!this.lexer.state.inLink&&this.rules.other.startATag.test(e[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(e[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(e[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(e[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:e[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:e[0]}}link(r){let e=this.rules.inline.link.exec(r);if(e){let t=e[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(t)){if(!this.rules.other.endAngleBracket.test(t))return;let s=N(t.slice(0,-1),"\\");if((t.length-s.length)%2===0)return}else{let s=qt(e[2],"()");if(s===-2)return;if(s>-1){let a=(e[0].indexOf("!")===0?5:4)+e[1].length+s;e[2]=e[2].substring(0,s),e[0]=e[0].substring(0,a).trim(),e[3]=""}}let i=e[2],n="";if(this.options.pedantic){let s=this.rules.other.pedanticHrefTitle.exec(i);s&&(i=s[1],n=s[3])}else n=e[3]?e[3].slice(1,-1):"";return i=i.trim(),this.rules.other.startAngleBracket.test(i)&&(this.options.pedantic&&!this.rules.other.endAngleBracket.test(t)?i=i.slice(1):i=i.slice(1,-1)),Se(e,{href:i&&i.replace(this.rules.inline.anyPunctuation,"$1"),title:n&&n.replace(this.rules.inline.anyPunctuation,"$1")},e[0],this.lexer,this.rules)}}reflink(r,e){let t;if((t=this.rules.inline.reflink.exec(r))||(t=this.rules.inline.nolink.exec(r))){let i=(t[2]||t[1]).replace(this.rules.other.multipleSpaceGlobal," "),n=e[i.toLowerCase()];if(!n){let s=t[0].charAt(0);return{type:"text",raw:s,text:s}}return Se(t,n,t[0],this.lexer,this.rules)}}emStrong(r,e,t=""){let i=this.rules.inline.emStrongLDelim.exec(r);if(!(!i||i[3]&&t.match(this.rules.other.unicodeAlphaNumeric))&&(!(i[1]||i[2])||!t||this.rules.inline.punctuation.exec(t))){let n=[...i[0]].length-1,s,a,o=n,c=0,l=i[0][0]==="*"?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(l.lastIndex=0,e=e.slice(-1*r.length+n);(i=l.exec(e))!=null;){if(s=i[1]||i[2]||i[3]||i[4]||i[5]||i[6],!s)continue;if(a=[...s].length,i[3]||i[4]){o+=a;continue}else if((i[5]||i[6])&&n%3&&!((n+a)%3)){c+=a;continue}if(o-=a,o>0)continue;a=Math.min(a,a+o+c);let d=[...i[0]][0].length,u=r.slice(0,n+i.index+d+a);if(Math.min(n,a)%2){let p=u.slice(1,-1);return{type:"em",raw:u,text:p,tokens:this.lexer.inlineTokens(p)}}let m=u.slice(2,-2);return{type:"strong",raw:u,text:m,tokens:this.lexer.inlineTokens(m)}}}}codespan(r){let e=this.rules.inline.code.exec(r);if(e){let t=e[2].replace(this.rules.other.newLineCharGlobal," "),i=this.rules.other.nonSpaceChar.test(t),n=this.rules.other.startingSpaceChar.test(t)&&this.rules.other.endingSpaceChar.test(t);return i&&n&&(t=t.substring(1,t.length-1)),{type:"codespan",raw:e[0],text:t}}}br(r){let e=this.rules.inline.br.exec(r);if(e)return{type:"br",raw:e[0]}}del(r){let e=this.rules.inline.del.exec(r);if(e)return{type:"del",raw:e[0],text:e[2],tokens:this.lexer.inlineTokens(e[2])}}autolink(r){let e=this.rules.inline.autolink.exec(r);if(e){let t,i;return e[2]==="@"?(t=e[1],i="mailto:"+t):(t=e[1],i=t),{type:"link",raw:e[0],text:t,href:i,tokens:[{type:"text",raw:t,text:t}]}}}url(r){var t;let e;if(e=this.rules.inline.url.exec(r)){let i,n;if(e[2]==="@")i=e[0],n="mailto:"+i;else{let s;do s=e[0],e[0]=((t=this.rules.inline._backpedal.exec(e[0]))==null?void 0:t[0])??"";while(s!==e[0]);i=e[0],e[1]==="www."?n="http://"+e[0]:n=e[0]}return{type:"link",raw:e[0],text:i,href:n,tokens:[{type:"text",raw:i,text:i}]}}}inlineText(r){let e=this.rules.inline.text.exec(r);if(e){let t=this.lexer.state.inRawBlock;return{type:"text",raw:e[0],text:e[0],escaped:t}}}},j=class te{constructor(e){h(this,"tokens");h(this,"options");h(this,"state");h(this,"inlineQueue");h(this,"tokenizer");this.tokens=[],this.tokens.links=Object.create(null),this.options=e||$,this.options.tokenizer=this.options.tokenizer||new G,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,top:!0};let t={other:S,block:V.normal,inline:B.normal};this.options.pedantic?(t.block=V.pedantic,t.inline=B.pedantic):this.options.gfm&&(t.block=V.gfm,this.options.breaks?t.inline=B.breaks:t.inline=B.gfm),this.tokenizer.rules=t}static get rules(){return{block:V,inline:B}}static lex(e,t){return new te(t).lex(e)}static lexInline(e,t){return new te(t).inlineTokens(e)}lex(e){e=e.replace(S.carriageReturn,`
`),this.blockTokens(e,this.tokens);for(let t=0;t<this.inlineQueue.length;t++){let i=this.inlineQueue[t];this.inlineTokens(i.src,i.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(e,t=[],i=!1){var n,s,a;for(this.options.pedantic&&(e=e.replace(S.tabCharGlobal,"    ").replace(S.spaceLine,""));e;){let o;if((s=(n=this.options.extensions)==null?void 0:n.block)!=null&&s.some(l=>(o=l.call({lexer:this},e,t))?(e=e.substring(o.raw.length),t.push(o),!0):!1))continue;if(o=this.tokenizer.space(e)){e=e.substring(o.raw.length);let l=t.at(-1);o.raw.length===1&&l!==void 0?l.raw+=`
`:t.push(o);continue}if(o=this.tokenizer.code(e)){e=e.substring(o.raw.length);let l=t.at(-1);(l==null?void 0:l.type)==="paragraph"||(l==null?void 0:l.type)==="text"?(l.raw+=(l.raw.endsWith(`
`)?"":`
`)+o.raw,l.text+=`
`+o.text,this.inlineQueue.at(-1).src=l.text):t.push(o);continue}if(o=this.tokenizer.fences(e)){e=e.substring(o.raw.length),t.push(o);continue}if(o=this.tokenizer.heading(e)){e=e.substring(o.raw.length),t.push(o);continue}if(o=this.tokenizer.hr(e)){e=e.substring(o.raw.length),t.push(o);continue}if(o=this.tokenizer.blockquote(e)){e=e.substring(o.raw.length),t.push(o);continue}if(o=this.tokenizer.list(e)){e=e.substring(o.raw.length),t.push(o);continue}if(o=this.tokenizer.html(e)){e=e.substring(o.raw.length),t.push(o);continue}if(o=this.tokenizer.def(e)){e=e.substring(o.raw.length);let l=t.at(-1);(l==null?void 0:l.type)==="paragraph"||(l==null?void 0:l.type)==="text"?(l.raw+=(l.raw.endsWith(`
`)?"":`
`)+o.raw,l.text+=`
`+o.raw,this.inlineQueue.at(-1).src=l.text):this.tokens.links[o.tag]||(this.tokens.links[o.tag]={href:o.href,title:o.title},t.push(o));continue}if(o=this.tokenizer.table(e)){e=e.substring(o.raw.length),t.push(o);continue}if(o=this.tokenizer.lheading(e)){e=e.substring(o.raw.length),t.push(o);continue}let c=e;if((a=this.options.extensions)!=null&&a.startBlock){let l=1/0,d=e.slice(1),u;this.options.extensions.startBlock.forEach(m=>{u=m.call({lexer:this},d),typeof u=="number"&&u>=0&&(l=Math.min(l,u))}),l<1/0&&l>=0&&(c=e.substring(0,l+1))}if(this.state.top&&(o=this.tokenizer.paragraph(c))){let l=t.at(-1);i&&(l==null?void 0:l.type)==="paragraph"?(l.raw+=(l.raw.endsWith(`
`)?"":`
`)+o.raw,l.text+=`
`+o.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=l.text):t.push(o),i=c.length!==e.length,e=e.substring(o.raw.length);continue}if(o=this.tokenizer.text(e)){e=e.substring(o.raw.length);let l=t.at(-1);(l==null?void 0:l.type)==="text"?(l.raw+=(l.raw.endsWith(`
`)?"":`
`)+o.raw,l.text+=`
`+o.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=l.text):t.push(o);continue}if(e){let l="Infinite loop on byte: "+e.charCodeAt(0);if(this.options.silent){console.error(l);break}else throw new Error(l)}}return this.state.top=!0,t}inline(e,t=[]){return this.inlineQueue.push({src:e,tokens:t}),t}inlineTokens(e,t=[]){var c,l,d,u,m;let i=e,n=null;if(this.tokens.links){let p=Object.keys(this.tokens.links);if(p.length>0)for(;(n=this.tokenizer.rules.inline.reflinkSearch.exec(i))!=null;)p.includes(n[0].slice(n[0].lastIndexOf("[")+1,-1))&&(i=i.slice(0,n.index)+"["+"a".repeat(n[0].length-2)+"]"+i.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))}for(;(n=this.tokenizer.rules.inline.anyPunctuation.exec(i))!=null;)i=i.slice(0,n.index)+"++"+i.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);let s;for(;(n=this.tokenizer.rules.inline.blockSkip.exec(i))!=null;)s=n[2]?n[2].length:0,i=i.slice(0,n.index+s)+"["+"a".repeat(n[0].length-s-2)+"]"+i.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);i=((l=(c=this.options.hooks)==null?void 0:c.emStrongMask)==null?void 0:l.call({lexer:this},i))??i;let a=!1,o="";for(;e;){a||(o=""),a=!1;let p;if((u=(d=this.options.extensions)==null?void 0:d.inline)!=null&&u.some(f=>(p=f.call({lexer:this},e,t))?(e=e.substring(p.raw.length),t.push(p),!0):!1))continue;if(p=this.tokenizer.escape(e)){e=e.substring(p.raw.length),t.push(p);continue}if(p=this.tokenizer.tag(e)){e=e.substring(p.raw.length),t.push(p);continue}if(p=this.tokenizer.link(e)){e=e.substring(p.raw.length),t.push(p);continue}if(p=this.tokenizer.reflink(e,this.tokens.links)){e=e.substring(p.raw.length);let f=t.at(-1);p.type==="text"&&(f==null?void 0:f.type)==="text"?(f.raw+=p.raw,f.text+=p.text):t.push(p);continue}if(p=this.tokenizer.emStrong(e,i,o)){e=e.substring(p.raw.length),t.push(p);continue}if(p=this.tokenizer.codespan(e)){e=e.substring(p.raw.length),t.push(p);continue}if(p=this.tokenizer.br(e)){e=e.substring(p.raw.length),t.push(p);continue}if(p=this.tokenizer.del(e)){e=e.substring(p.raw.length),t.push(p);continue}if(p=this.tokenizer.autolink(e)){e=e.substring(p.raw.length),t.push(p);continue}if(!this.state.inLink&&(p=this.tokenizer.url(e))){e=e.substring(p.raw.length),t.push(p);continue}let g=e;if((m=this.options.extensions)!=null&&m.startInline){let f=1/0,k=e.slice(1),y;this.options.extensions.startInline.forEach(_=>{y=_.call({lexer:this},k),typeof y=="number"&&y>=0&&(f=Math.min(f,y))}),f<1/0&&f>=0&&(g=e.substring(0,f+1))}if(p=this.tokenizer.inlineText(g)){e=e.substring(p.raw.length),p.raw.slice(-1)!=="_"&&(o=p.raw.slice(-1)),a=!0;let f=t.at(-1);(f==null?void 0:f.type)==="text"?(f.raw+=p.raw,f.text+=p.text):t.push(p);continue}if(e){let f="Infinite loop on byte: "+e.charCodeAt(0);if(this.options.silent){console.error(f);break}else throw new Error(f)}}return t}},X=class{constructor(r){h(this,"options");h(this,"parser");this.options=r||$}space(r){return""}code({text:r,lang:e,escaped:t}){var s;let i=(s=(e||"").match(S.notSpaceStart))==null?void 0:s[0],n=r.replace(S.endingNewline,"")+`
`;return i?'<pre><code class="language-'+P(i)+'">'+(t?n:P(n,!0))+`</code></pre>
`:"<pre><code>"+(t?n:P(n,!0))+`</code></pre>
`}blockquote({tokens:r}){return`<blockquote>
${this.parser.parse(r)}</blockquote>
`}html({text:r}){return r}def(r){return""}heading({tokens:r,depth:e}){return`<h${e}>${this.parser.parseInline(r)}</h${e}>
`}hr(r){return`<hr>
`}list(r){let e=r.ordered,t=r.start,i="";for(let a=0;a<r.items.length;a++){let o=r.items[a];i+=this.listitem(o)}let n=e?"ol":"ul",s=e&&t!==1?' start="'+t+'"':"";return"<"+n+s+`>
`+i+"</"+n+`>
`}listitem(r){return`<li>${this.parser.parse(r.tokens)}</li>
`}checkbox({checked:r}){return"<input "+(r?'checked="" ':"")+'disabled="" type="checkbox"> '}paragraph({tokens:r}){return`<p>${this.parser.parseInline(r)}</p>
`}table(r){let e="",t="";for(let n=0;n<r.header.length;n++)t+=this.tablecell(r.header[n]);e+=this.tablerow({text:t});let i="";for(let n=0;n<r.rows.length;n++){let s=r.rows[n];t="";for(let a=0;a<s.length;a++)t+=this.tablecell(s[a]);i+=this.tablerow({text:t})}return i&&(i=`<tbody>${i}</tbody>`),`<table>
<thead>
`+e+`</thead>
`+i+`</table>
`}tablerow({text:r}){return`<tr>
${r}</tr>
`}tablecell(r){let e=this.parser.parseInline(r.tokens),t=r.header?"th":"td";return(r.align?`<${t} align="${r.align}">`:`<${t}>`)+e+`</${t}>
`}strong({tokens:r}){return`<strong>${this.parser.parseInline(r)}</strong>`}em({tokens:r}){return`<em>${this.parser.parseInline(r)}</em>`}codespan({text:r}){return`<code>${P(r,!0)}</code>`}br(r){return"<br>"}del({tokens:r}){return`<del>${this.parser.parseInline(r)}</del>`}link({href:r,title:e,tokens:t}){let i=this.parser.parseInline(t),n=ye(r);if(n===null)return i;r=n;let s='<a href="'+r+'"';return e&&(s+=' title="'+P(e)+'"'),s+=">"+i+"</a>",s}image({href:r,title:e,text:t,tokens:i}){i&&(t=this.parser.parseInline(i,this.parser.textRenderer));let n=ye(r);if(n===null)return P(t);r=n;let s=`<img src="${r}" alt="${t}"`;return e&&(s+=` title="${P(e)}"`),s+=">",s}text(r){return"tokens"in r&&r.tokens?this.parser.parseInline(r.tokens):"escaped"in r&&r.escaped?r.text:P(r.text)}},ue=class{strong({text:r}){return r}em({text:r}){return r}codespan({text:r}){return r}del({text:r}){return r}html({text:r}){return r}text({text:r}){return r}link({text:r}){return""+r}image({text:r}){return""+r}br(){return""}checkbox({raw:r}){return r}},E=class ie{constructor(e){h(this,"options");h(this,"renderer");h(this,"textRenderer");this.options=e||$,this.options.renderer=this.options.renderer||new X,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new ue}static parse(e,t){return new ie(t).parse(e)}static parseInline(e,t){return new ie(t).parseInline(e)}parse(e){var i,n;let t="";for(let s=0;s<e.length;s++){let a=e[s];if((n=(i=this.options.extensions)==null?void 0:i.renderers)!=null&&n[a.type]){let c=a,l=this.options.extensions.renderers[c.type].call({parser:this},c);if(l!==!1||!["space","hr","heading","code","table","blockquote","list","html","def","paragraph","text"].includes(c.type)){t+=l||"";continue}}let o=a;switch(o.type){case"space":{t+=this.renderer.space(o);break}case"hr":{t+=this.renderer.hr(o);break}case"heading":{t+=this.renderer.heading(o);break}case"code":{t+=this.renderer.code(o);break}case"table":{t+=this.renderer.table(o);break}case"blockquote":{t+=this.renderer.blockquote(o);break}case"list":{t+=this.renderer.list(o);break}case"checkbox":{t+=this.renderer.checkbox(o);break}case"html":{t+=this.renderer.html(o);break}case"def":{t+=this.renderer.def(o);break}case"paragraph":{t+=this.renderer.paragraph(o);break}case"text":{t+=this.renderer.text(o);break}default:{let c='Token with "'+o.type+'" type was not found.';if(this.options.silent)return console.error(c),"";throw new Error(c)}}}return t}parseInline(e,t=this.renderer){var n,s;let i="";for(let a=0;a<e.length;a++){let o=e[a];if((s=(n=this.options.extensions)==null?void 0:n.renderers)!=null&&s[o.type]){let l=this.options.extensions.renderers[o.type].call({parser:this},o);if(l!==!1||!["escape","html","link","image","strong","em","codespan","br","del","text"].includes(o.type)){i+=l||"";continue}}let c=o;switch(c.type){case"escape":{i+=t.text(c);break}case"html":{i+=t.html(c);break}case"link":{i+=t.link(c);break}case"image":{i+=t.image(c);break}case"checkbox":{i+=t.checkbox(c);break}case"strong":{i+=t.strong(c);break}case"em":{i+=t.em(c);break}case"codespan":{i+=t.codespan(c);break}case"br":{i+=t.br(c);break}case"del":{i+=t.del(c);break}case"text":{i+=t.text(c);break}default:{let l='Token with "'+c.type+'" type was not found.';if(this.options.silent)return console.error(l),"";throw new Error(l)}}}return i}},O,D=(O=class{constructor(r){h(this,"options");h(this,"block");this.options=r||$}preprocess(r){return r}postprocess(r){return r}processAllTokens(r){return r}emStrongMask(r){return r}provideLexer(){return this.block?j.lex:j.lexInline}provideParser(){return this.block?E.parse:E.parseInline}},h(O,"passThroughHooks",new Set(["preprocess","postprocess","processAllTokens","emStrongMask"])),h(O,"passThroughHooksRespectAsync",new Set(["preprocess","postprocess","processAllTokens"])),O),qe=class{constructor(...r){h(this,"defaults",re());h(this,"options",this.setOptions);h(this,"parse",this.parseMarkdown(!0));h(this,"parseInline",this.parseMarkdown(!1));h(this,"Parser",E);h(this,"Renderer",X);h(this,"TextRenderer",ue);h(this,"Lexer",j);h(this,"Tokenizer",G);h(this,"Hooks",D);this.use(...r)}walkTokens(r,e){var i,n;let t=[];for(let s of r)switch(t=t.concat(e.call(this,s)),s.type){case"table":{let a=s;for(let o of a.header)t=t.concat(this.walkTokens(o.tokens,e));for(let o of a.rows)for(let c of o)t=t.concat(this.walkTokens(c.tokens,e));break}case"list":{let a=s;t=t.concat(this.walkTokens(a.items,e));break}default:{let a=s;(n=(i=this.defaults.extensions)==null?void 0:i.childTokens)!=null&&n[a.type]?this.defaults.extensions.childTokens[a.type].forEach(o=>{let c=a[o].flat(1/0);t=t.concat(this.walkTokens(c,e))}):a.tokens&&(t=t.concat(this.walkTokens(a.tokens,e)))}}return t}use(...r){let e=this.defaults.extensions||{renderers:{},childTokens:{}};return r.forEach(t=>{let i={...t};if(i.async=this.defaults.async||i.async||!1,t.extensions&&(t.extensions.forEach(n=>{if(!n.name)throw new Error("extension name required");if("renderer"in n){let s=e.renderers[n.name];s?e.renderers[n.name]=function(...a){let o=n.renderer.apply(this,a);return o===!1&&(o=s.apply(this,a)),o}:e.renderers[n.name]=n.renderer}if("tokenizer"in n){if(!n.level||n.level!=="block"&&n.level!=="inline")throw new Error("extension level must be 'block' or 'inline'");let s=e[n.level];s?s.unshift(n.tokenizer):e[n.level]=[n.tokenizer],n.start&&(n.level==="block"?e.startBlock?e.startBlock.push(n.start):e.startBlock=[n.start]:n.level==="inline"&&(e.startInline?e.startInline.push(n.start):e.startInline=[n.start]))}"childTokens"in n&&n.childTokens&&(e.childTokens[n.name]=n.childTokens)}),i.extensions=e),t.renderer){let n=this.defaults.renderer||new X(this.defaults);for(let s in t.renderer){if(!(s in n))throw new Error(`renderer '${s}' does not exist`);if(["options","parser"].includes(s))continue;let a=s,o=t.renderer[a],c=n[a];n[a]=(...l)=>{let d=o.apply(n,l);return d===!1&&(d=c.apply(n,l)),d||""}}i.renderer=n}if(t.tokenizer){let n=this.defaults.tokenizer||new G(this.defaults);for(let s in t.tokenizer){if(!(s in n))throw new Error(`tokenizer '${s}' does not exist`);if(["options","rules","lexer"].includes(s))continue;let a=s,o=t.tokenizer[a],c=n[a];n[a]=(...l)=>{let d=o.apply(n,l);return d===!1&&(d=c.apply(n,l)),d}}i.tokenizer=n}if(t.hooks){let n=this.defaults.hooks||new D;for(let s in t.hooks){if(!(s in n))throw new Error(`hook '${s}' does not exist`);if(["options","block"].includes(s))continue;let a=s,o=t.hooks[a],c=n[a];D.passThroughHooks.has(s)?n[a]=l=>{if(this.defaults.async&&D.passThroughHooksRespectAsync.has(s))return(async()=>{let u=await o.call(n,l);return c.call(n,u)})();let d=o.call(n,l);return c.call(n,d)}:n[a]=(...l)=>{if(this.defaults.async)return(async()=>{let u=await o.apply(n,l);return u===!1&&(u=await c.apply(n,l)),u})();let d=o.apply(n,l);return d===!1&&(d=c.apply(n,l)),d}}i.hooks=n}if(t.walkTokens){let n=this.defaults.walkTokens,s=t.walkTokens;i.walkTokens=function(a){let o=[];return o.push(s.call(this,a)),n&&(o=o.concat(n.call(this,a))),o}}this.defaults={...this.defaults,...i}}),this}setOptions(r){return this.defaults={...this.defaults,...r},this}lexer(r,e){return j.lex(r,e??this.defaults)}parser(r,e){return E.parse(r,e??this.defaults)}parseMarkdown(r){return(e,t)=>{let i={...t},n={...this.defaults,...i},s=this.onError(!!n.silent,!!n.async);if(this.defaults.async===!0&&i.async===!1)return s(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof e>"u"||e===null)return s(new Error("marked(): input parameter is undefined or null"));if(typeof e!="string")return s(new Error("marked(): input parameter is of type "+Object.prototype.toString.call(e)+", string expected"));if(n.hooks&&(n.hooks.options=n,n.hooks.block=r),n.async)return(async()=>{let a=n.hooks?await n.hooks.preprocess(e):e,o=await(n.hooks?await n.hooks.provideLexer():r?j.lex:j.lexInline)(a,n),c=n.hooks?await n.hooks.processAllTokens(o):o;n.walkTokens&&await Promise.all(this.walkTokens(c,n.walkTokens));let l=await(n.hooks?await n.hooks.provideParser():r?E.parse:E.parseInline)(c,n);return n.hooks?await n.hooks.postprocess(l):l})().catch(s);try{n.hooks&&(e=n.hooks.preprocess(e));let a=(n.hooks?n.hooks.provideLexer():r?j.lex:j.lexInline)(e,n);n.hooks&&(a=n.hooks.processAllTokens(a)),n.walkTokens&&this.walkTokens(a,n.walkTokens);let o=(n.hooks?n.hooks.provideParser():r?E.parse:E.parseInline)(a,n);return n.hooks&&(o=n.hooks.postprocess(o)),o}catch(a){return s(a)}}}onError(r,e){return t=>{if(t.message+=`
Please report this to https://github.com/markedjs/marked.`,r){let i="<p>An error occurred:</p><pre>"+P(t.message+"",!0)+"</pre>";return e?Promise.resolve(i):i}if(e)return Promise.reject(t);throw t}}},L=new qe;function w(r,e){return L.parse(r,e)}w.options=w.setOptions=function(r){return L.setOptions(r),w.defaults=L.defaults,$e(w.defaults),w};w.getDefaults=re;w.defaults=$;w.use=function(...r){return L.use(...r),w.defaults=L.defaults,$e(w.defaults),w};w.walkTokens=function(r,e){return L.walkTokens(r,e)};w.parseInline=L.parseInline;w.Parser=E;w.parser=E.parse;w.Renderer=X;w.TextRenderer=ue;w.Lexer=j;w.lexer=j.lex;w.Tokenizer=G;w.Hooks=D;w.parse=w;w.options;w.setOptions;w.use;w.walkTokens;w.parseInline;E.parse;j.lex;const Te=document.createElement("div");function v(r){return Te.textContent=r,Te.innerHTML}const Ot={Read:"file_path",ReadFile:"file_path",Write:"file_path",Edit:"file_path",Glob:"pattern",Grep:"pattern",Bash:"command",WebFetch:"url",WebSearch:"query",Task:"description",NotebookEdit:"notebook_path"},je=80;function me(r,e){if(!e||typeof e!="object")return"";const t=e,i=Ot[r];if(i&&t[i]!=null)return Ee(String(t[i]),je);for(const n of Object.values(t))if(typeof n=="string"&&n.length>0)return Ee(n,je);return""}function Ee(r,e){const t=r.replace(/\n/g," ");return t.length<=e?t:t.slice(0,e-1)+"…"}let R=null;function Wt(){if(R)return R;R=new qe;const r={gfm:!0,breaks:!1};return R.setOptions(r),R.use({renderer:{code(e){const t=e.lang?v(e.lang):"",i=v(e.text);return`<div class="thinkt-code-block">
          <div class="thinkt-code-block__header">
            ${t?`<span class="thinkt-code-block__lang">${t}</span>`:'<span class="thinkt-code-block__lang">code</span>'}
            <button class="thinkt-copy-btn" data-copy-action="code">Copy</button>
          </div>
          <pre><code>${i}</code></pre>
        </div>`},html(e){return v(e.text)}}}),R}function ne(r){return Wt().parse(r,{async:!1})}function M(r){return r==null||r<=0?"":r<1e3?`${r}ms`:`${(r/1e3).toFixed(1)}s`}function Kt(r){return r.replace(/[^a-z0-9\s-]/gi,"").replace(/\s+/g,"-").substring(0,50).toLowerCase()||"conversation"}function Pe(r,e,t){const i=new Blob([r],{type:t}),n=URL.createObjectURL(i),s=document.createElement("a");s.href=n,s.download=e,document.body.appendChild(s),s.click(),document.body.removeChild(s),URL.revokeObjectURL(n)}const Zt=`
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 16px;
      background: #0a0a0a;
      color: #e0e0e0;
    }
    h1 { 
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 16px;
      padding-bottom: 10px;
      border-bottom: 1px solid #2a2a2a;
      color: #e0e0e0;
    }
    
    /* Entry cards - matches .thinkt-conversation-entry */
    .entry { 
      margin-bottom: 16px;
      border-radius: 8px;
      border: 1px solid #2a2a2a;
      background: #141414;
      overflow: hidden;
    }
    
    /* Entry header - matches .thinkt-conversation-entry__header */
    .entry-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid #2a2a2a;
    }
    
    .role {
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .role-user { color: #6366f1; }
    .role-assistant { color: #d97750; }
    .role-system { color: #888; }
    .role-tool { color: #19c39b; }
    
    .timestamp {
      margin-left: auto;
      font-size: 11px;
      color: #666;
    }
    
    /* Content area - matches .thinkt-conversation-entry__content */
    .content {
      padding: 12px;
    }
    
    /* Text blocks - matches .thinkt-conversation-entry__text */
    .text {
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    /* Markdown content - matches .thinkt-conversation-entry__text--markdown */
    .text h1, .text h2, .text h3, .text h4, .text h5, .text h6 {
      margin: 1em 0 0.5em;
      line-height: 1.3;
      color: #e0e0e0;
    }
    .text h1:first-child, .text h2:first-child, .text h3:first-child { margin-top: 0; }
    .text h1 { font-size: 1.4em; }
    .text h2 { font-size: 1.2em; }
    .text h3 { font-size: 1.1em; }
    .text p { margin: 0.5em 0; }
    .text p:first-child { margin-top: 0; }
    .text p:last-child { margin-bottom: 0; }
    .text ul, .text ol { margin: 0.5em 0; padding-left: 1.5em; }
    .text li { margin: 0.2em 0; }
    .text blockquote { margin: 0.5em 0; padding: 0.5em 1em; border-left: 3px solid #444; color: #aaa; background: rgba(255, 255, 255, 0.02); }
    .text a { color: #6366f1; text-decoration: none; }
    .text a:hover { text-decoration: underline; }
    .text code { font-family: 'SF Mono', Monaco, monospace; font-size: 0.9em; padding: 0.15em 0.4em; background: rgba(255, 255, 255, 0.08); border-radius: 3px; }
    .text pre { margin: 0.5em 0; border-radius: 6px; border: 1px solid #2a2a2a; overflow: hidden; background: rgba(0, 0, 0, 0.3); }
    .text pre code { display: block; padding: 10px 12px; background: none; border-radius: 0; overflow-x: auto; font-size: 12px; line-height: 1.5; }
    .text table { border-collapse: collapse; margin: 0.5em 0; width: 100%; }
    .text th, .text td { border: 1px solid #333; padding: 6px 10px; text-align: left; }
    .text th { background: rgba(255, 255, 255, 0.05); font-weight: 600; }
    .text hr { border: none; border-top: 1px solid #333; margin: 1em 0; }
    .text img { max-width: 100%; }
    
    /* Thinking blocks - matches .thinkt-thinking-block */
    .thinking {
      margin-top: 12px;
      border-radius: 4px;
      background: rgba(99, 102, 241, 0.08);
      border-left: 3px solid #6366f1;
      overflow: hidden;
    }
    .thinking-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      cursor: pointer;
      user-select: none;
      transition: background 0.12s ease;
    }
    .thinking-header:hover { background: rgba(99, 102, 241, 0.06); }
    .thinking-toggle { font-size: 10px; color: #6366f1; transition: transform 0.15s ease; }
    .thinking-label { font-size: 11px; font-weight: 600; color: #6366f1; }
    .thinking-content {
      display: none;
      padding: 8px 12px;
      font-style: italic;
      color: #a5a6f3;
      white-space: pre-wrap;
      word-break: break-word;
      border-top: 1px solid rgba(99, 102, 241, 0.15);
      max-height: 400px;
      overflow-y: auto;
    }
    .thinking.expanded .thinking-content { display: block; }
    .thinking.expanded .thinking-toggle { transform: rotate(90deg); }
    
    /* Tool calls - matches .thinkt-tool-call */
    .tool {
      margin-top: 8px;
      border-radius: 4px;
      background: rgba(25, 195, 155, 0.06);
      border-left: 3px solid #19c39b;
      overflow: hidden;
    }
    .tool-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      cursor: pointer;
      user-select: none;
      font-size: 12px;
      transition: background 0.12s ease;
    }
    .tool-header:hover { background: rgba(25, 195, 155, 0.06); }
    .tool-toggle { font-size: 10px; color: #19c39b; transition: transform 0.15s ease; }
    .tool-bullet { color: #666; }
    .tool-name { font-weight: 600; color: #19c39b; }
    .tool-summary { color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; font-family: 'SF Mono', Monaco, monospace; font-size: 11px; }
    .tool-content {
      display: none;
      padding: 8px 12px;
      border-top: 1px solid rgba(25, 195, 155, 0.15);
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 11px;
      background: rgba(0, 0, 0, 0.3);
      overflow-x: auto;
      max-height: 300px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .tool.expanded .tool-content { display: block; }
    .tool.expanded .tool-toggle { transform: rotate(90deg); }
    
    /* Tool result blocks */
    .tool-result { background: rgba(34, 197, 94, 0.1); border-left-color: #22c55e; }
    .tool-result .tool-header:hover { background: rgba(34, 197, 94, 0.06); }
    .tool-result .tool-toggle { color: #22c55e; }
    .tool-result .tool-label { color: #22c55e; }
    
    .tool-error { background: rgba(239, 68, 68, 0.1); border-left-color: #ef4444; }
    .tool-error .tool-header:hover { background: rgba(239, 68, 68, 0.06); }
    .tool-error .tool-toggle { color: #ef4444; }
    .tool-error .tool-label { color: #ef4444; }
    
    /* Inline tool result (nested inside tool call) */
    .tool-result-inline {
      margin-top: 4px;
      border-top: 1px solid rgba(25, 195, 155, 0.15);
    }
    .tool-result-inline .tool-header {
      background: rgba(34, 197, 94, 0.08);
    }
    .tool-result-inline.tool-result--error .tool-header {
      background: rgba(239, 68, 68, 0.08);
    }
    
    /* Meta footer */
    .meta { 
      color: #666; 
      font-size: 11px; 
      margin-top: 20px; 
      padding-top: 10px; 
      border-top: 1px solid #2a2a2a; 
    }
    
    /* Empty state */
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      color: #666;
      text-align: center;
    }
    .empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.4; }
    .empty-title { font-size: 16px; font-weight: 500; margin-bottom: 6px; color: #e0e0e0; }
`;function Gt(r,e,t){const i=t??{user:!0,assistant:!0,thinking:!0,toolUse:!0,toolResult:!0,system:!1};let n=`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${v(e)}</title>
  <style>${Zt}</style>
</head>
<body>
  <h1>${v(e)}</h1>
`;const s=new Map;for(const o of r)for(const c of o.contentBlocks||[])if(c.type==="tool_result"){const l=c;s.set(l.toolUseId,l)}const a=new Set;for(const o of r){const c=(o.role||"unknown").toLowerCase(),l=o.timestamp?new Date(o.timestamp).toLocaleString():"",d=c==="user",u=c==="assistant",m=c==="system";if(d&&!i.user||u&&!i.assistant||m&&!i.system||!d&&!u&&!m)continue;let p="",g=!1;if(o.contentBlocks&&o.contentBlocks.length>0)for(const f of o.contentBlocks)switch(f.type){case"text":{f.text&&f.text.trim()&&(p+=`      <div class="text">${ne(f.text)}</div>
`,g=!0);break}case"thinking":{i.thinking&&(p+=Xt(f),g=!0);break}case"tool_use":{if(i.toolUse){const k=f,y=s.get(k.toolUseId);y&&a.add(k.toolUseId),p+=Yt(k,y,i),g=!0}break}case"tool_result":{const k=f;i.toolResult&&!a.has(k.toolUseId)&&(p+=Qt(k),g=!0);break}}(!o.contentBlocks||o.contentBlocks.length===0)&&o.text&&o.text.trim()&&(p+=`      <div class="text">${ne(o.text)}</div>
`,g=!0),g&&(n+=`  <div class="entry">
`,n+=`    <div class="entry-header">
`,n+=`      <span class="role role-${c}">${v(c)}</span>
`,l&&(n+=`      <span class="timestamp">${v(l)}</span>
`),n+=`    </div>
`,n+=`    <div class="content">
`,n+=p,n+=`    </div>
`,n+=`  </div>
`)}return n+=`  <div class="meta">Exported from THINKT on ${new Date().toLocaleString()}</div>
</body>
</html>`,n}function Xt(r){return`      <div class="thinking">
        <div class="thinking-header">
          <span class="thinking-toggle">▶</span>
          <span class="thinking-label">Thinking${r.durationMs?` (${M(r.durationMs)})`:""}</span>
        </div>
        <div class="thinking-content">${v(r.thinking||"")}</div>
      </div>
`}function Yt(r,e,t){const i=JSON.stringify(r.toolInput,null,2),n=me(r.toolName,r.toolInput),s=n?`<span class="tool-summary">(${v(n)})</span>`:"";let a="";if(e&&t.toolResult){const o=e.isError?"tool-result--error":"",c=e.isError?"Error":"Result",l=e.durationMs?` (${M(e.durationMs)})`:"";a=`
        <div class="tool-result-inline ${o}">
          <div class="tool-header">
            <span class="tool-toggle">▶</span>
            <span class="tool-label">${c}${l}</span>
          </div>
          <div class="tool-content">${v(String(e.toolResult||""))}</div>
        </div>`}return`      <div class="tool">
        <div class="tool-header">
          <span class="tool-toggle">▶</span>
          <span class="tool-bullet">•</span>
          <span class="tool-name">${v(r.toolName)}</span>
          ${s}
        </div>
        <div class="tool-content">${v(i)}</div>${a}
      </div>
`}function Qt(r){const e=r.isError?"tool tool-error":"tool tool-result",t=r.isError?"Error":"Result",i=r.durationMs?` (${M(r.durationMs)})`:"";return`      <div class="${e}">
        <div class="tool-header">
          <span class="tool-toggle">▶</span>
          <span class="tool-label">${t}${i}</span>
        </div>
        <div class="tool-content">${v(String(r.toolResult||""))}</div>
      </div>
`}function Jt(r,e,t){const i=t??{user:!0,assistant:!0,thinking:!0,toolUse:!0,toolResult:!0,system:!1};let n=`# ${e}

`;const s=new Map;for(const o of r)for(const c of o.contentBlocks||[])if(c.type==="tool_result"){const l=c;s.set(l.toolUseId,l)}const a=new Set;for(const o of r){const c=(o.role||"unknown").toLowerCase(),l=c==="user",d=c==="assistant",u=c==="system";if(l&&!i.user||d&&!i.assistant||u&&!i.system||!l&&!d&&!u)continue;let m="";if(o.contentBlocks&&o.contentBlocks.length>0)for(const g of o.contentBlocks)switch(g.type){case"text":{g.text&&g.text.trim()&&(m+=g.text+`

`);break}case"thinking":{if(i.thinking){const f=g,k=f.durationMs?` (${M(f.durationMs)})`:"";m+=`<details>
<summary>Thinking${k}</summary>

\`\`\`
${f.thinking||""}
\`\`\`

</details>

`}break}case"tool_use":{if(i.toolUse){const f=g,k=JSON.stringify(f.toolInput,null,2),y=me(f.toolName,f.toolInput),_=y?` (${y})`:"";m+=`<details>
<summary>Tool: ${f.toolName}${_}</summary>

\`\`\`json
${k}
\`\`\`

</details>

`;const I=s.get(f.toolUseId);if(I&&(a.add(f.toolUseId),i.toolResult)){const q=I.isError?"Error":"Result";m+=`<details>
<summary>${q}</summary>

\`\`\`
${String(I.toolResult||"")}
\`\`\`

</details>

`}}break}case"tool_result":{const f=g;if(i.toolResult&&!a.has(f.toolUseId)){const k=f.isError?"Error":"Result";m+=`<details>
<summary>${k}</summary>

\`\`\`
${String(f.toolResult||"")}
\`\`\`

</details>

`}break}}if((!o.contentBlocks||o.contentBlocks.length===0)&&o.text&&o.text.trim()&&(m+=o.text+`

`),!m.trim())continue;const p=o.timestamp?new Date(o.timestamp).toLocaleString():"";n+=`---

`,n+=`## ${c.charAt(0).toUpperCase()+c.slice(1)}`,p&&(n+=` (${p})`),n+=`

`,n+=m}return n+=`---

*Exported from THINKT on ${new Date().toLocaleString()}*
`,n}class ei{constructor(e){h(this,"container");h(this,"contentContainer");h(this,"filterContainer");h(this,"toolbarContainer");h(this,"stylesInjected",!1);h(this,"client",null);h(this,"onToggleTimelinePanel",null);h(this,"isTimelinePanelVisible",null);h(this,"canToggleTimelinePanel",null);h(this,"filterState",{user:!0,assistant:!0,thinking:!1,toolUse:!1,toolResult:!1,system:!1});h(this,"currentProjectPath",null);h(this,"currentEntryCount",0);h(this,"currentEntries",[]);h(this,"toolResultIndex",new Map);h(this,"inlinedToolResults",new Set);h(this,"boundFilterHandlers",new Map);h(this,"availableApps",[]);h(this,"exportDropdownOpen",!1);this.container=e.elements.container,this.client=e.client??null,this.onToggleTimelinePanel=e.onToggleTimelinePanel??null,this.isTimelinePanelVisible=e.isTimelinePanelVisible??null,this.canToggleTimelinePanel=e.canToggleTimelinePanel??null,this.init(),this.fetchAvailableApps()}init(){this.injectStyles(),this.container.className="thinkt-conversation-view",this.createStructure(),this.setupFilters()}injectStyles(){if(this.stylesInjected)return;const e="thinkt-conversation-view-styles";if(!document.getElementById(e)){const t=document.createElement("style");t.id=e,t.textContent=lt,document.head.appendChild(t)}this.stylesInjected=!0}createStructure(){this.toolbarContainer=document.createElement("div"),this.toolbarContainer.className="thinkt-conversation-view__toolbar",this.renderToolbar(),this.container.appendChild(this.toolbarContainer),this.filterContainer=document.createElement("div"),this.filterContainer.className="thinkt-conversation-view__filters",this.renderFilterBar(),this.container.appendChild(this.filterContainer),this.contentContainer=document.createElement("div"),this.contentContainer.className="thinkt-conversation-view__content",this.container.appendChild(this.contentContainer),this.contentContainer.addEventListener("click",e=>this.handleContentClick(e)),this.showEmpty()}handleContentClick(e){const t=e.target,i=t.closest(".thinkt-thinking-block__header");if(i){const a=i.closest(".thinkt-thinking-block");a==null||a.classList.toggle("expanded");return}const n=t.closest(".thinkt-tool-call__summary");if(n){const a=n.closest(".thinkt-tool-call");a==null||a.classList.toggle("expanded");return}const s=t.closest(".thinkt-copy-btn");if(s){this.handleCopy(s);return}}async handleCopy(e){let t="";const i=e.dataset.copyAction;if(i==="code"){const n=e.closest(".thinkt-code-block"),s=n==null?void 0:n.querySelector("code");t=(s==null?void 0:s.textContent)??""}else if(i==="text"){const n=e.closest(".thinkt-conversation-entry__text");if(n){const s=n.cloneNode(!0);s.querySelectorAll(".thinkt-copy-btn").forEach(a=>a.remove()),t=s.textContent??""}}else if(i==="detail"){const n=e.closest(".thinkt-tool-call__detail-content");if(n){const s=n.cloneNode(!0);s.querySelectorAll(".thinkt-copy-btn").forEach(a=>a.remove()),t=s.textContent??""}}if(t)try{await navigator.clipboard.writeText(t);const n=e.textContent;e.textContent="✓",setTimeout(()=>{e.textContent=n},1500)}catch{}}async fetchAvailableApps(){if(this.client)try{this.availableApps=await this.client.getOpenInApps(),this.renderToolbar()}catch{}}renderToolbar(){var o,c;const e=this.currentProjectPath??"No project selected",t=this.currentEntryCount,i=((o=this.isTimelinePanelVisible)==null?void 0:o.call(this))??!1,n=((c=this.canToggleTimelinePanel)==null?void 0:c.call(this))??!1,s=this.onToggleTimelinePanel?`
          <button class="thinkt-conversation-view__toolbar-btn" id="toolbar-timeline-btn" ${n?"":"disabled"}>
            ${i?"Hide Timeline":"Show Timeline"}
          </button>
        `:"",a=this.availableApps.filter(l=>l.enabled).map(l=>`
        <div class="thinkt-conversation-view__toolbar-dropdown-item" data-action="${v(l.id??"")}">
          Open in ${v(l.name??l.id??"")}
        </div>
      `).join("");this.toolbarContainer.innerHTML=`
      <div class="thinkt-conversation-view__toolbar-path">
        <span class="thinkt-conversation-view__toolbar-path-icon">📁</span>
        <span class="thinkt-conversation-view__toolbar-path-text" title="${v(e)}">${v(e)}</span>
        <div class="thinkt-conversation-view__toolbar-path-actions">
          ${s}
          <div class="thinkt-conversation-view__toolbar-actions">
            <button class="thinkt-conversation-view__toolbar-btn" id="toolbar-open-btn">
              Open ▼
            </button>
            <div class="thinkt-conversation-view__toolbar-dropdown" id="toolbar-dropdown">
              ${a}
              <div class="thinkt-conversation-view__toolbar-dropdown-item" data-action="copy">
                <span class="icon">📋</span> Copy Path
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="thinkt-conversation-view__toolbar-metrics">
        ${t>0?`<span>${t} entries</span>`:""}
      </div>
    `,this.setupToolbarActions()}setupToolbarActions(){const e=this.toolbarContainer.querySelector("#toolbar-timeline-btn");e&&e.addEventListener("click",()=>{var n;(n=this.onToggleTimelinePanel)==null||n.call(this),this.renderToolbar()});const t=this.toolbarContainer.querySelector("#toolbar-open-btn"),i=this.toolbarContainer.querySelector("#toolbar-dropdown");!t||!i||(t.addEventListener("click",n=>{n.stopPropagation(),i.classList.toggle("open")}),document.addEventListener("click",()=>{i.classList.remove("open")}),i.querySelectorAll(".thinkt-conversation-view__toolbar-dropdown-item").forEach(n=>{n.addEventListener("click",s=>{s.stopPropagation();const a=n.dataset.action;this.handleToolbarAction(a??""),i.classList.remove("open")})}))}async handleToolbarAction(e){if(this.currentProjectPath){if(e==="copy"){try{await navigator.clipboard.writeText(this.currentProjectPath)}catch{}return}if(this.client)try{await this.client.openIn(e,this.currentProjectPath)}catch{try{await navigator.clipboard.writeText(this.currentProjectPath)}catch{}}else try{await navigator.clipboard.writeText(this.currentProjectPath)}catch{}}}setProjectPath(e,t){this.currentProjectPath=e,t!==void 0&&(this.currentEntryCount=t),this.renderToolbar()}renderFilterBar(){const e=this.currentEntries.length>0;this.filterContainer.innerHTML=`
      <span class="thinkt-conversation-view__filter-label">Show:</span>
      <button class="thinkt-conversation-view__filter-btn ${this.filterState.user?"active":""}" data-filter="user">
        User
      </button>
      <button class="thinkt-conversation-view__filter-btn ${this.filterState.assistant?"active":""}" data-filter="assistant">
        Assistant
      </button>
      <button class="thinkt-conversation-view__filter-btn ${this.filterState.thinking?"active":""}" data-filter="thinking">
        Thinking
      </button>
      <button class="thinkt-conversation-view__filter-btn ${this.filterState.toolUse?"active":""}" data-filter="toolUse">
        Tool Use
      </button>
      <button class="thinkt-conversation-view__filter-btn ${this.filterState.toolResult?"active":""}" data-filter="toolResult">
        Tool Result
      </button>
      <button class="thinkt-conversation-view__filter-btn ${this.filterState.system?"active":""}" data-filter="system">
        System
      </button>
      <div class="thinkt-conversation-view__export">
        <button class="thinkt-conversation-view__export-btn" id="export-btn" ${e?"":"disabled"}>
          Export ▼
        </button>
        <div class="thinkt-conversation-view__export-dropdown" id="export-dropdown">
          <div class="thinkt-conversation-view__export-dropdown-item" data-format="html">
            <span class="icon">🌐</span> Export as HTML
          </div>
          <div class="thinkt-conversation-view__export-dropdown-item" data-format="markdown">
            <span class="icon">📝</span> Export as Markdown
          </div>
        </div>
      </div>
    `,this.setupExportHandlers()}setupExportHandlers(){const e=this.filterContainer.querySelector("#export-btn"),t=this.filterContainer.querySelector("#export-dropdown");!e||!t||(e.addEventListener("click",i=>{i.stopPropagation(),this.exportDropdownOpen=!this.exportDropdownOpen,this.exportDropdownOpen?(this.positionDropdown(e,t),t.classList.add("open")):t.classList.remove("open")}),document.addEventListener("click",()=>{this.exportDropdownOpen&&(this.exportDropdownOpen=!1,t.classList.remove("open"))}),t.querySelectorAll(".thinkt-conversation-view__export-dropdown-item").forEach(i=>{i.addEventListener("click",n=>{n.stopPropagation();const s=i.dataset.format;s&&this.handleExport(s),this.exportDropdownOpen=!1,t.classList.remove("open")})}))}positionDropdown(e,t){const i=e.getBoundingClientRect();t.style.top=`${i.bottom+4}px`,t.style.right=`${window.innerWidth-i.right}px`}handleExport(e){const t=this.currentProjectPath?`${this.currentProjectPath.split("/").pop()||"conversation"}`:"conversation",i={user:this.filterState.user,assistant:this.filterState.assistant,thinking:this.filterState.thinking,toolUse:this.filterState.toolUse,toolResult:this.filterState.toolResult,system:this.filterState.system};if(this.currentEntries.length===0)return;const n=Kt(t);if(e==="html"){const s=Gt(this.currentEntries,t,i);Pe(s,`${n}.html`,"text/html")}else if(e==="markdown"){const s=Jt(this.currentEntries,t,i);Pe(s,`${n}.md`,"text/markdown")}}setupFilters(){this.filterContainer.querySelectorAll(".thinkt-conversation-view__filter-btn").forEach(t=>{const i=t,n=i.dataset.filter;if(!n)return;const s=()=>{this.filterState[n]=!this.filterState[n],i.classList.toggle("active",this.filterState[n]),this.applyFilters()};i.addEventListener("click",s),this.boundFilterHandlers.set(i,s)})}applyFilters(){this.contentContainer.querySelectorAll("[data-role]").forEach(e=>{const t=e,i=t.dataset.role,n=t.dataset.blockType;let s=!1;i==="user"?s=!this.filterState.user:i==="assistant"?s=!this.filterState.assistant:i==="system"&&(s=!this.filterState.system),!s&&n&&(n==="thinking"?s=!this.filterState.thinking:n==="toolUse"?s=!this.filterState.toolUse:n==="toolResult"&&(s=!this.filterState.toolResult)),t.classList.toggle("hidden",s)})}getFilterState(){return{...this.filterState}}setFilterState(e){Object.assign(this.filterState,e),this.renderFilterBar(),this.setupFilters(),this.applyFilters()}buildToolResultIndex(e){this.toolResultIndex.clear(),this.inlinedToolResults.clear();for(const t of e)if(t.contentBlocks){for(const i of t.contentBlocks)if(i.type==="tool_result"){const n=i;this.toolResultIndex.set(n.toolUseId,n)}}}displaySession(e){if(this.contentContainer.innerHTML="",this.currentEntries=e.entries||[],this.currentEntries.length===0){this.showEmpty(),this.renderFilterBar();return}this.buildToolResultIndex(this.currentEntries);for(let t=0;t<this.currentEntries.length;t++){const i=this.currentEntries[t],n=this.renderEntry(i,t);this.contentContainer.appendChild(n)}this.renderFilterBar(),this.setupFilters(),this.applyFilters(),this.contentContainer.scrollTop=0}displayEntries(e){if(this.contentContainer.innerHTML="",this.currentEntries=e||[],this.currentEntries.length===0){this.showEmpty(),this.renderFilterBar();return}this.buildToolResultIndex(this.currentEntries);for(let t=0;t<this.currentEntries.length;t++){const i=this.currentEntries[t],n=this.renderEntry(i,t);this.contentContainer.appendChild(n)}this.currentEntryCount=this.currentEntries.length,this.renderToolbar(),this.renderFilterBar(),this.setupFilters(),this.applyFilters(),this.contentContainer.scrollTop=0}renderEntry(e,t){var l;const i=document.createDocumentFragment(),n=e.role||"unknown",s=e.timestamp?new Date(e.timestamp).toLocaleString():"";if(!((l=e.contentBlocks)!=null&&l.length)){if(e.text){const d=n==="assistant"?this.renderAssistantText(e.text):this.renderPlainText(e.text);i.appendChild(this.createTextCard(n,s,d))}return i}let a="",o=!0;const c=()=>{a&&(i.appendChild(this.createTextCard(n,o?s:"",a)),a="",o=!1)};for(const d of e.contentBlocks)switch(d.type){case"text":d.text&&d.text.trim()&&(a+=n==="assistant"?this.renderAssistantText(d.text):this.renderPlainText(d.text));break;case"thinking":c(),i.appendChild(this.createStandaloneBlock(n,"thinking",this.renderThinkingBlock(d.thinking||"",d.durationMs)));break;case"tool_use":c(),i.appendChild(this.createStandaloneBlock(n,"toolUse",this.renderToolCall(d.toolUseId,d.toolName,d.toolInput)));break;case"tool_result":this.inlinedToolResults.has(d.toolUseId)||(c(),i.appendChild(this.createStandaloneBlock(n,"toolResult",this.renderToolResultBlock(d))));break}if(c(),t!==void 0)for(let d=0;d<i.childNodes.length;d++){const u=i.childNodes[d];u instanceof HTMLElement&&(u.dataset.entryIndex=String(t))}return i}createTextCard(e,t,i){const n=document.createElement("div");n.className="thinkt-conversation-entry",n.dataset.role=e,n.dataset.blockType="text";const s=`thinkt-conversation-entry__role--${e}`;return n.innerHTML=`
      <div class="thinkt-conversation-entry__header">
        <span class="thinkt-conversation-entry__role ${s}">${v(e)}</span>
        ${t?`<span class="thinkt-conversation-entry__timestamp">${v(t)}</span>`:""}
      </div>
      <div class="thinkt-conversation-entry__content">${i}</div>
    `,n}createStandaloneBlock(e,t,i){const n=document.createElement("div");return n.className="thinkt-standalone-block",n.dataset.role=e,n.dataset.blockType=t,n.innerHTML=i,n}renderAssistantText(e){return`<div class="thinkt-conversation-entry__text thinkt-conversation-entry__text--markdown">${ne(e)}<button class="thinkt-copy-btn thinkt-copy-btn--float" data-copy-action="text">Copy</button></div>`}renderPlainText(e){return`<div class="thinkt-conversation-entry__text">${v(e)}</div>`}renderToolResultBlock(e){const t=e.isError?"thinkt-conversation-entry__tool-result--error":"",i=e.isError?"Error":"Result";return`
      <div class="thinkt-conversation-entry__tool-result ${t}">
        <div class="thinkt-conversation-entry__tool-result-label">${i}</div>
        <div class="thinkt-conversation-entry__text">${v(String(e.toolResult||""))}</div>
      </div>
    `}renderThinkingBlock(e,t){const i=M(t),n=i?`<span class="thinkt-thinking-block__duration">(${v(i)})</span>`:"",s=e.replace(/\n/g," ").slice(0,80),a=s?`<span class="thinkt-thinking-block__preview">${v(s)}${e.length>80?"…":""}</span>`:"";return`
      <div class="thinkt-thinking-block" data-type="thinking">
        <div class="thinkt-thinking-block__header">
          <span class="thinkt-thinking-block__toggle">▶</span>
          <span class="thinkt-thinking-block__label">Thinking</span>
          ${n}
          ${a}
        </div>
        <div class="thinkt-thinking-block__content">${v(e)}</div>
      </div>
    `}renderToolCall(e,t,i){const n=me(t,i),s=n?`<span class="thinkt-tool-call__arg">(${v(n)})</span>`:"",a=this.toolResultIndex.get(e);let o,c="",l="";if(a){this.inlinedToolResults.add(e),a.isError?o='<span class="thinkt-tool-call__status thinkt-tool-call__status--error">✗</span>':o='<span class="thinkt-tool-call__status thinkt-tool-call__status--ok">✓</span>';const u=M(a.durationMs);u&&(l=`<span class="thinkt-tool-call__duration">${v(u)}</span>`);const m=a.isError?" thinkt-tool-call__detail-result--error":"",p=a.isError?"Error":"Result";c=`
        <div class="thinkt-tool-call__detail-section thinkt-tool-call__detail-result${m}">
          <div class="thinkt-tool-call__detail-label">${p}</div>
          <div class="thinkt-tool-call__detail-content">${v(String(a.toolResult||""))}<button class="thinkt-copy-btn thinkt-copy-btn--float" data-copy-action="detail">Copy</button></div>
        </div>
      `}else o='<span class="thinkt-tool-call__status thinkt-tool-call__status--pending">•</span>';const d=v(JSON.stringify(i,null,2));return`
      <div class="thinkt-tool-call" data-type="toolUse" data-tool-use-id="${v(e)}">
        <div class="thinkt-tool-call__summary">
          <span class="thinkt-tool-call__toggle">▶</span>
          <span class="thinkt-tool-call__bullet">•</span>
          <span class="thinkt-tool-call__name">${v(t)}</span>
          ${s}
          ${l}
          ${o}
        </div>
        <div class="thinkt-tool-call__detail">
          <div class="thinkt-tool-call__detail-section">
            <div class="thinkt-tool-call__detail-label">Input</div>
            <div class="thinkt-tool-call__detail-content">${d}<button class="thinkt-copy-btn thinkt-copy-btn--float" data-copy-action="detail">Copy</button></div>
          </div>
          ${c}
        </div>
      </div>
    `}showEmpty(){this.currentEntries=[],this.contentContainer.innerHTML=`
      <div class="thinkt-conversation-empty">
        <div class="thinkt-conversation-empty__icon">💬</div>
        <div class="thinkt-conversation-empty__title">No conversation loaded</div>
        <div>Select a session to view the conversation</div>
      </div>
    `,this.renderFilterBar()}clear(){this.showEmpty()}refreshToolbar(){this.renderToolbar()}scrollToEntry(e){const t=this.contentContainer.querySelector(`[data-entry-index="${e}"]`);t&&(t.scrollIntoView({behavior:"smooth",block:"center"}),t.classList.add("thinkt-conversation-entry--highlighted"),setTimeout(()=>{t.classList.remove("thinkt-conversation-entry--highlighted")},2e3))}dispose(){this.boundFilterHandlers.forEach((e,t)=>{t.removeEventListener("click",e)}),this.boundFilterHandlers.clear(),this.container.innerHTML=""}}const ti=`
.thinkt-tree-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: var(--thinkt-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  color: var(--thinkt-text-color, #e0e0e0);
  background: var(--thinkt-bg-color, #1a1a1a);
  overflow: hidden;
}

.thinkt-tree-header {
  padding: 12px;
  border-bottom: 1px solid var(--thinkt-border-color, #333);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.thinkt-tree-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--thinkt-muted-color, #888);
}

.thinkt-tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.thinkt-tree-empty {
  padding: 48px 24px;
  text-align: center;
  color: var(--thinkt-muted-color, #666);
}

.thinkt-tree-empty-icon {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.5;
}

/* Project Group */
.thinkt-tree-project {
  margin-bottom: 4px;
}

.thinkt-tree-project-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  user-select: none;
}

.thinkt-tree-project-header:hover {
  background: var(--thinkt-hover-bg, #252525);
}

.thinkt-tree-project-header.expanded {
  background: var(--thinkt-hover-bg, #252525);
}

.thinkt-tree-chevron {
  font-size: 10px;
  color: var(--thinkt-muted-color, #666);
  transition: transform 0.2s ease;
  width: 12px;
  text-align: center;
}

.thinkt-tree-chevron.expanded {
  transform: rotate(90deg);
}

.thinkt-tree-folder-icon {
  font-size: 14px;
  color: var(--thinkt-accent-color, #6366f1);
}

.thinkt-tree-project-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thinkt-tree-project-meta {
  font-size: 11px;
  color: var(--thinkt-muted-color, #666);
  display: flex;
  align-items: center;
  gap: 6px;
}

.thinkt-tree-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--thinkt-bg-tertiary, #2a2a2a);
  color: var(--thinkt-muted-color, #888);
}

/* Source Group */
.thinkt-tree-source {
  margin-left: 20px;
  margin-bottom: 2px;
}

.thinkt-tree-source-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  user-select: none;
}

.thinkt-tree-source-header:hover {
  background: var(--thinkt-hover-bg, #252525);
}

.thinkt-tree-source-icon {
  font-size: 12px;
  width: 16px;
  text-align: center;
}

.thinkt-tree-source-icon--claude {
  color: #d97750;
}

.thinkt-tree-source-icon--kimi {
  color: #19c39b;
}

.thinkt-tree-source-icon--gemini {
  color: #6366f1;
}

.thinkt-tree-source-name {
  flex: 1;
  font-size: 12px;
  color: var(--thinkt-text-secondary, #a0a0a0);
  text-transform: capitalize;
}

.thinkt-tree-source-count {
  font-size: 10px;
  color: var(--thinkt-muted-color, #666);
}

/* Sessions */
.thinkt-tree-sessions {
  margin-left: 36px;
}

.thinkt-tree-session {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.12s ease;
  margin-bottom: 1px;
}

.thinkt-tree-session:hover {
  background: var(--thinkt-hover-bg, #252525);
}

.thinkt-tree-session.selected {
  background: var(--thinkt-selected-bg, rgba(99, 102, 241, 0.15));
  border-left: 2px solid var(--thinkt-accent-color, #6366f1);
  margin-left: -2px;
}

.thinkt-tree-session-icon {
  font-size: 10px;
  color: var(--thinkt-muted-color, #666);
}

.thinkt-tree-session-title {
  flex: 1;
  font-size: 11px;
  color: var(--thinkt-text-secondary, #a0a0a0);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thinkt-tree-session-time {
  font-size: 10px;
  color: var(--thinkt-muted-color, #666);
}

/* Loading & Error */
.thinkt-tree-loading,
.thinkt-tree-error {
  padding: 48px;
  text-align: center;
  color: var(--thinkt-muted-color, #666);
}

.thinkt-tree-retry {
  margin-top: 12px;
  padding: 6px 16px;
  background: transparent;
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 4px;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
}

.thinkt-tree-retry:hover {
  background: var(--thinkt-hover-bg, #252525);
}
`;class ii{constructor(e){h(this,"options");h(this,"client");h(this,"container");h(this,"contentContainer");h(this,"projectGroups",new Map);h(this,"expandedProjects",new Set);h(this,"expandedSources",new Set);h(this,"selectedSessionId",null);h(this,"searchQuery","");h(this,"sourceFilter",null);h(this,"isLoading",!1);h(this,"stylesInjected",!1);h(this,"boundHandlers",[]);this.options=e,this.client=e.client??A(),this.container=e.elements.container,this.contentContainer=document.createElement("div"),this.init()}init(){this.injectStyles(),this.createStructure(),this.loadData()}injectStyles(){if(this.stylesInjected)return;const e="thinkt-tree-browser-styles";if(!document.getElementById(e)){const t=document.createElement("style");t.id=e,t.textContent=ti,document.head.appendChild(t)}this.stylesInjected=!0}createStructure(){this.container.className="thinkt-tree-browser",this.container.innerHTML=`
      <div class="thinkt-tree-header">
        <span class="thinkt-tree-title">Projects</span>
      </div>
    `,this.contentContainer.className="thinkt-tree-content",this.container.appendChild(this.contentContainer),this.showLoading()}async loadData(){var e,t;if(!this.isLoading){this.isLoading=!0,this.showLoading();try{const i=await this.client.getProjects();if(this.projectGroups=this.groupProjectsByPath(i),await this.loadAllSessions(i),this.render(),this.projectGroups.size<=3){for(const n of this.projectGroups.keys())this.expandedProjects.add(n);this.render()}}catch(i){const n=i instanceof Error?i:new Error(String(i));this.showError(n),(t=(e=this.options).onError)==null||t.call(e,n)}finally{this.isLoading=!1}}}groupProjectsByPath(e){const t=new Map;for(const i of e){if(!i.path)continue;const n=i.displayPath||i.path,s=i.name||this.extractProjectName(n),a=this.normalizeProjectPath(n);let o=t.get(a);o||(o={path:a,name:s,sources:new Map,totalSessions:0,lastModified:new Date(0)},t.set(a,o));const c=i.source||"unknown";if(o.sources.has(c)||o.sources.set(c,{source:c,project:i,sessions:[]}),o.totalSessions+=i.sessionCount||0,i.lastModified){const l=new Date(i.lastModified);l>o.lastModified&&(o.lastModified=l)}}return t}extractProjectName(e){const t=e.split(/[/\\]/).filter(i=>i&&i!=="."&&i!=="..");for(;t.length>1;){const i=t[t.length-1],n=t[t.length-2];if(["projects","workspaces","repos","src"].includes(n)||!i.startsWith(".")&&i.length>2)return i;t.pop()}return t[t.length-1]||"Unknown"}normalizeProjectPath(e){let t=e.replace(/^~\//,"/").replace(/\\/g,"/");const i=[/\.claude\/projects\//,/\.kimi\/projects\//,/\.thinkt\/projects\//];for(const n of i)t=t.replace(n,"");return t}async loadAllSessions(e){for(const[,t]of this.projectGroups){for(const[,n]of t.sources)try{if(n.project.id){const s=await this.client.getSessions(n.project.id);s.sort((a,o)=>{var d,u;const c=((d=a.modifiedAt)==null?void 0:d.getTime())||0;return(((u=o.modifiedAt)==null?void 0:u.getTime())||0)-c}),n.sessions=s}}catch{n.sessions=[]}let i=0;for(const n of t.sources.values())i+=n.sessions.length;t.totalSessions=i}}render(){const e=this.getFilteredProjectGroups();if(e.length===0){this.showEmpty(this.hasActiveFilters()&&this.projectGroups.size>0?"No projects match your filter":"No projects found");return}this.contentContainer.innerHTML="";const t=e.sort((i,n)=>n.lastModified.getTime()-i.lastModified.getTime());for(const i of t){const n=this.renderProjectGroup(i);this.contentContainer.appendChild(n)}}renderProjectGroup(e){const t=this.expandedProjects.has(e.path),i=document.createElement("div");i.className="thinkt-tree-project";const n=document.createElement("div");if(n.className=`thinkt-tree-project-header ${t?"expanded":""}`,n.innerHTML=`
      <span class="thinkt-tree-chevron ${t?"expanded":""}">▶</span>
      <span class="thinkt-tree-folder-icon">📁</span>
      <span class="thinkt-tree-project-name" title="${this.escapeHtml(e.path)}">${this.escapeHtml(e.name)}</span>
      <span class="thinkt-tree-project-meta">
        <span class="thinkt-tree-badge">${e.sources.size} source${e.sources.size!==1?"s":""}</span>
        <span class="thinkt-tree-badge">${e.totalSessions}</span>
      </span>
    `,n.addEventListener("click",()=>{t?this.expandedProjects.delete(e.path):this.expandedProjects.add(e.path),this.render()}),i.appendChild(n),t){const s=document.createElement("div");s.className="thinkt-tree-sources";const a=Array.from(e.sources.values()).sort((o,c)=>{const l={claude:0,kimi:1,gemini:2,copilot:3,thinkt:4};return(l[o.source]??99)-(l[c.source]??99)});for(const o of a){const c=this.renderSourceGroup(e,o);s.appendChild(c)}i.appendChild(s)}return i}renderSourceGroup(e,t){const i=`${e.path}::${t.source}`,n=this.expandedSources.has(i),s=document.createElement("div");s.className="thinkt-tree-source";const a=document.createElement("div");a.className="thinkt-tree-source-header";const o=this.getSourceIcon(t.source);if(a.innerHTML=`
      <span class="thinkt-tree-chevron ${n?"expanded":""}">▶</span>
      <span class="thinkt-tree-source-icon thinkt-tree-source-icon--${t.source}">${o}</span>
      <span class="thinkt-tree-source-name">${this.escapeHtml(t.source)}</span>
      <span class="thinkt-tree-source-count">${t.sessions.length}</span>
    `,a.addEventListener("click",()=>{n?this.expandedSources.delete(i):this.expandedSources.add(i),this.render()}),s.appendChild(a),n){const c=document.createElement("div");c.className="thinkt-tree-sessions";for(const l of t.sessions){const d=this.renderSession(l,e);c.appendChild(d)}s.appendChild(c)}return s}renderSession(e,t){var a;const i=document.createElement("div");i.className="thinkt-tree-session",e.id===this.selectedSessionId&&i.classList.add("selected");const n=e.firstPrompt?e.firstPrompt.slice(0,50)+(e.firstPrompt.length>50?"...":""):((a=e.id)==null?void 0:a.slice(0,8))||"Unknown",s=e.modifiedAt?this.formatRelativeTime(e.modifiedAt):"";return i.innerHTML=`
      <span class="thinkt-tree-session-icon">💬</span>
      <span class="thinkt-tree-session-title" title="${this.escapeHtml(e.firstPrompt||"")}">${this.escapeHtml(n)}</span>
      ${s?`<span class="thinkt-tree-session-time">${s}</span>`:""}
    `,i.addEventListener("click",()=>{this.selectSession(e,t)}),i}getSourceIcon(e){return{claude:"◉",kimi:"◉",gemini:"◉",copilot:"◉",thinkt:"◉"}[e]||"◉"}formatRelativeTime(e){const t=e instanceof Date?e:new Date(e),n=new Date().getTime()-t.getTime(),s=Math.floor(n/1e3),a=Math.floor(s/60),o=Math.floor(a/60),c=Math.floor(o/24);return s<60?"now":a<60?`${a}m`:o<24?`${o}h`:c<7?`${c}d`:t.toLocaleDateString(void 0,{month:"short",day:"numeric"})}selectSession(e,t){var i,n;this.selectedSessionId=e.id||null,this.render(),(n=(i=this.options).onSessionSelect)==null||n.call(i,e,t)}showLoading(){this.contentContainer.innerHTML=`
      <div class="thinkt-tree-loading">
        <div>Loading projects...</div>
      </div>
    `}showEmpty(e="No projects found"){this.contentContainer.innerHTML=`
      <div class="thinkt-tree-empty">
        <div class="thinkt-tree-empty-icon">📁</div>
        <div>${this.escapeHtml(e)}</div>
      </div>
    `}showError(e){this.contentContainer.innerHTML=`
      <div class="thinkt-tree-error">
        <div>Error: ${this.escapeHtml(e.message)}</div>
        <button class="thinkt-tree-retry">Retry</button>
      </div>
    `;const t=this.contentContainer.querySelector(".thinkt-tree-retry");t&&t.addEventListener("click",()=>{this.loadData()})}escapeHtml(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}refresh(){return this.loadData()}setSearch(e){this.searchQuery=e.trim().toLowerCase(),!this.isLoading&&this.render()}setSourceFilter(e){this.sourceFilter=(e==null?void 0:e.trim().toLowerCase())||null,!this.isLoading&&this.render()}hasActiveFilters(){return this.searchQuery.length>0||this.sourceFilter!==null}getFilteredProjectGroups(){const e=this.searchQuery,t=this.sourceFilter,i=[];for(const n of this.projectGroups.values()){const s=new Map;for(const[l,d]of n.sources)t&&l.toLowerCase()!==t||s.set(l,d);if(s.size===0||!(e.length===0||n.name.toLowerCase().includes(e)||n.path.toLowerCase().includes(e)||Array.from(s.values()).some(l=>l.source.toLowerCase().includes(e))))continue;let o=0,c=new Date(0);for(const l of s.values())if(o+=l.sessions.length,l.project.lastModified){const d=new Date(l.project.lastModified);d>c&&(c=d)}i.push({...n,sources:s,totalSessions:o,lastModified:c.getTime()>0?c:n.lastModified})}return i}dispose(){this.boundHandlers.forEach(e=>e()),this.boundHandlers=[],this.container.innerHTML=""}}const ni=[{id:"1d",label:"1d"},{id:"1w",label:"1w"},{id:"all",label:"All"}],si={claude:"#d97750",kimi:"#19c39b",gemini:"#6366f1",copilot:"#0078d4",thinkt:"#888888"},ri=`
.thinkt-timeline {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: var(--thinkt-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  color: var(--thinkt-text-color, #e0e0e0);
  background: var(--thinkt-bg-color, #1a1a1a);
  overflow: hidden;
}

.thinkt-timeline-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--thinkt-border-color, #333);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.thinkt-timeline-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--thinkt-muted-color, #888);
}

.thinkt-timeline-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.thinkt-timeline-btn {
  font-size: 11px;
  padding: 4px 10px;
  background: var(--thinkt-bg-tertiary, #252525);
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 4px;
  color: var(--thinkt-text-secondary, #a0a0a0);
  cursor: pointer;
  transition: all 0.15s ease;
}

.thinkt-timeline-btn:hover {
  background: var(--thinkt-hover-bg, #333);
}

.thinkt-timeline-btn.active {
  background: var(--thinkt-accent-color, #6366f1);
  border-color: var(--thinkt-accent-color, #6366f1);
  color: white;
}

.thinkt-timeline-zoom {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 6px;
  padding-left: 8px;
  border-left: 1px solid var(--thinkt-border-color, #333);
}

.thinkt-timeline-zoom-preset {
  font-size: 10px;
  padding: 3px 6px;
  min-width: 30px;
  background: var(--thinkt-bg-tertiary, #252525);
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 3px;
  color: var(--thinkt-text-secondary, #a0a0a0);
  cursor: pointer;
}

.thinkt-timeline-zoom-preset:hover {
  background: var(--thinkt-hover-bg, #333);
}

.thinkt-timeline-scroll:focus-visible {
  outline: 1px solid var(--thinkt-accent-color, #6366f1);
  outline-offset: -1px;
}

.thinkt-timeline-scroll {
  position: absolute;
  inset: 0;
  overflow: auto;
}

.thinkt-timeline-viewport {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.thinkt-timeline-chart-content {
  position: relative;
  min-height: 100%;
}

.thinkt-timeline-time-axis {
  position: sticky;
  top: 0;
  height: 30px;
  background: transparent;
  border-bottom: 1px solid var(--thinkt-border-color, #333);
  z-index: 20;
}

.thinkt-timeline-time-label {
  position: absolute;
  top: 8px;
  font-size: 10px;
  color: var(--thinkt-muted-color, #666);
  transform: translateX(-50%);
  white-space: nowrap;
}

.thinkt-timeline-source-content {
  min-width: 100%;
  min-height: 100%;
}

.thinkt-timeline-source-header {
  position: sticky;
  top: 0;
  height: 30px;
  border-bottom: 1px solid var(--thinkt-border-color, #333);
  background: var(--thinkt-bg-color, #1a1a1a);
  z-index: 20;
}

.thinkt-timeline-source-axis-corner {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-right: 1px solid var(--thinkt-border-color, #2a2a2a);
}

.thinkt-timeline-source-header-label {
  position: absolute;
  top: 8px;
  transform: translateX(-50%);
  font-size: 11px;
  font-weight: 600;
  color: var(--thinkt-text-secondary, #a0a0a0);
  white-space: nowrap;
}

.thinkt-timeline-source-time-label {
  position: absolute;
  left: 8px;
  transform: translateY(-50%);
  font-size: 10px;
  color: var(--thinkt-muted-color, #666);
  white-space: nowrap;
  pointer-events: none;
}

.thinkt-timeline-source-svg {
  display: block;
}

.thinkt-timeline-chart-row {
  height: 50px;
  border-bottom: 1px solid var(--thinkt-border-color, #222);
  position: relative;
}

.thinkt-timeline-chart-svg {
  display: block;
  height: 100%;
}

/* Floating labels: fixed X, synced Y with scroll position */
.thinkt-timeline-label-overlay {
  position: absolute;
  left: 0;
  right: auto;
  top: 0;
  bottom: 0;
  width: 140px;
  overflow: hidden;
  pointer-events: none;
  z-index: 30;
}

.thinkt-timeline-label-track {
  position: absolute;
  left: 0;
  right: 0;
  top: 30px;
  will-change: transform;
}

.thinkt-timeline-label-item {
  position: absolute;
  left: 10px;
  right: 8px;
  height: 50px;
  display: flex;
  align-items: flex-start;
  padding-top: 7px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.1;
  color: var(--thinkt-text-secondary, #a0a0a0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: transparent;
}

.thinkt-timeline-label-item.clickable {
  pointer-events: auto;
  cursor: pointer;
}

.thinkt-timeline-label-item.clickable:hover {
  color: var(--thinkt-text-color, #e0e0e0);
}

.thinkt-timeline-tooltip {
  position: absolute;
  background: var(--thinkt-bg-secondary, #1a1a1a);
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 12px;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  max-width: 280px;
}

.thinkt-timeline-tooltip-title {
  font-weight: 500;
  color: var(--thinkt-text-primary, #f0f0f0);
  margin-bottom: 4px;
  line-height: 1.3;
}

.thinkt-timeline-tooltip-meta {
  color: var(--thinkt-muted-color, #888);
  font-size: 11px;
}

.thinkt-timeline-empty,
.thinkt-timeline-loading,
.thinkt-timeline-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--thinkt-muted-color, #666);
  text-align: center;
  padding: 48px;
}
`;class oi{constructor(e){h(this,"options");h(this,"client");h(this,"container");h(this,"viewport");h(this,"scrollArea");h(this,"labelOverlay");h(this,"labelTrack");h(this,"allSessions",[]);h(this,"sessions",[]);h(this,"rows",[]);h(this,"searchQuery","");h(this,"sourceFilter",null);h(this,"tooltip",null);h(this,"isLoading",!1);h(this,"stylesInjected",!1);h(this,"groupBy","project");h(this,"disposed",!1);h(this,"rafScrollSync",0);h(this,"hasInitialAlignment",!1);h(this,"pendingZoomAnchor",null);h(this,"rowHeight",50);h(this,"blobRadius",6);h(this,"labelWidth",140);h(this,"labelPadding",16);h(this,"timeAxisHeight",30);h(this,"minChartWidth",640);h(this,"minChartHeight",480);h(this,"rightPadding",32);h(this,"sourceAxisWidth",64);h(this,"sourceColumnWidth",96);h(this,"sourceColumnGap",8);h(this,"defaultMsPerPixel",420*1e3);h(this,"minMsPerPixel",30*1e3);h(this,"maxMsPerPixel",1440*60*1e3);h(this,"zoomMsPerPixel",this.defaultMsPerPixel);h(this,"handleScroll",()=>{this.groupBy==="project"&&this.rafScrollSync===0&&(this.rafScrollSync=window.requestAnimationFrame(()=>{this.rafScrollSync=0,this.updateLabelTrackPosition()}))});h(this,"handleWheel",e=>{if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();const t=Math.exp(e.deltaY*.0015),i=this.clampZoom(this.zoomMsPerPixel*t),n=this.scrollArea.getBoundingClientRect(),s=this.groupBy==="project"?e.clientX-n.left:e.clientY-n.top;this.setZoom(i,s)});h(this,"handleKeyDown",e=>{if(this.isEditableTarget(e.target))return;const t=this.groupBy==="project"?this.scrollArea.clientWidth/2:this.scrollArea.clientHeight/2;if(e.key==="+"||e.key==="="){e.preventDefault(),this.setZoom(this.zoomMsPerPixel*.85,t);return}if(e.key==="-"||e.key==="_"){e.preventDefault(),this.setZoom(this.zoomMsPerPixel*1.15,t);return}e.key==="0"&&(e.preventDefault(),this.setZoom(this.defaultMsPerPixel,t))});this.options=e,this.client=e.client??A(),this.groupBy=e.groupBy??"project",this.container=e.elements.container,this.viewport=document.createElement("div"),this.scrollArea=document.createElement("div"),this.labelOverlay=document.createElement("div"),this.labelTrack=document.createElement("div"),this.init()}init(){this.injectStyles(),this.createStructure(),this.loadData()}injectStyles(){if(this.stylesInjected)return;const e="thinkt-timeline-styles";if(!document.getElementById(e)){const t=document.createElement("style");t.id=e,t.textContent=ri,document.head.appendChild(t)}this.stylesInjected=!0}createStructure(){this.container.className="thinkt-timeline",this.container.innerHTML=`
      <div class="thinkt-timeline-header">
        <span class="thinkt-timeline-title">Timeline</span>
        <div class="thinkt-timeline-controls">
          <button class="thinkt-timeline-btn ${this.groupBy==="project"?"active":""}" data-group="project">By Project</button>
          <button class="thinkt-timeline-btn ${this.groupBy==="source"?"active":""}" data-group="source">By Source</button>
          <div class="thinkt-timeline-zoom">
            ${ni.map(i=>`<button class="thinkt-timeline-zoom-preset" data-zoom-preset="${i.id}">${i.label}</button>`).join("")}
          </div>
        </div>
      </div>
    `,this.viewport.className="thinkt-timeline-viewport",this.container.appendChild(this.viewport),this.scrollArea.className="thinkt-timeline-scroll",this.scrollArea.tabIndex=0,this.scrollArea.addEventListener("scroll",this.handleScroll),this.scrollArea.addEventListener("wheel",this.handleWheel,{passive:!1}),this.scrollArea.addEventListener("keydown",this.handleKeyDown),this.viewport.appendChild(this.scrollArea),this.labelOverlay.className="thinkt-timeline-label-overlay",this.labelTrack.className="thinkt-timeline-label-track",this.labelTrack.style.top=`${this.timeAxisHeight}px`,this.labelOverlay.appendChild(this.labelTrack),this.viewport.appendChild(this.labelOverlay);const e=this.container.querySelectorAll(".thinkt-timeline-btn");e.forEach(i=>{i.addEventListener("click",()=>{const n=i.dataset.group;this.setGroupBy(n),e.forEach(s=>s.classList.remove("active")),i.classList.add("active")})}),this.container.querySelectorAll(".thinkt-timeline-zoom-preset").forEach(i=>{i.addEventListener("click",()=>{const n=i.dataset.zoomPreset;this.applyZoomPreset(n)})}),this.tooltip=document.createElement("div"),this.tooltip.className="thinkt-timeline-tooltip",this.tooltip.style.display="none",document.body.appendChild(this.tooltip),this.showLoading()}updateLabelTrackPosition(){if(this.groupBy!=="project")return;const e=this.scrollArea.scrollTop;this.labelTrack.style.transform=`translateY(${-e}px)`}isEditableTarget(e){if(!(e instanceof HTMLElement))return!1;const t=e.tagName.toLowerCase();return t==="input"||t==="textarea"||e.isContentEditable}clampZoom(e){return Math.min(this.maxMsPerPixel,Math.max(this.minMsPerPixel,e))}applyZoomPreset(e){if(this.sessions.length===0)return;const t=this.groupBy==="project"?Math.max(200,this.scrollArea.clientWidth-this.labelWidth-this.labelPadding-this.rightPadding):Math.max(200,this.scrollArea.clientHeight-this.timeAxisHeight-this.rightPadding);let i=this.zoomMsPerPixel;switch(e){case"1d":i=1440*60*1e3/t;break;case"1w":i=10080*60*1e3/t;break;case"all":{const s=this.getTimeRange();i=Math.max(1,s.end.getTime()-s.start.getTime())/t;break}}const n=this.groupBy==="project"?this.scrollArea.clientWidth/2:this.scrollArea.clientHeight/2;this.setZoom(i,n)}setZoom(e,t){if(this.sessions.length===0)return;const i=this.clampZoom(e);if(!(Math.abs(i-this.zoomMsPerPixel)<1e-4)){if(this.groupBy==="project"){const n=this.computeLayout(this.zoomMsPerPixel),s=this.getTimeAtViewportX(n,t);this.pendingZoomAnchor={timeMs:s,viewportCoord:t,axis:"x"}}else{const n=this.computeVerticalLayout(this.zoomMsPerPixel),s=this.getTimeAtViewportY(n,t);this.pendingZoomAnchor={timeMs:s,viewportCoord:t,axis:"y"}}this.zoomMsPerPixel=i,this.render()}}getTimeAtViewportX(e,t){const s=(this.scrollArea.scrollLeft+t-e.timelineStartX)/e.pxPerMs,a=Math.min(e.totalDuration,Math.max(0,s));return e.timeRange.start.getTime()+a}getTimeAtViewportY(e,t){const s=(this.scrollArea.scrollTop+t-e.timelineStartY)/e.pxPerMs,a=Math.min(e.totalDuration,Math.max(0,s));return e.timeRange.end.getTime()-a}computeLayout(e){const t=this.getTimeRange(),i=Math.max(1,t.end.getTime()-t.start.getTime()),n=Math.max(...this.sessions.map(u=>u.timestamp.getTime())),s=this.scrollArea.clientWidth||this.minChartWidth,a=Math.max(this.minChartWidth,Math.ceil(i/e)),o=this.labelWidth+this.labelPadding,c=a/i,l=o+(n-t.start.getTime())*c,d=Math.max(s+this.rightPadding,Math.ceil(l+this.rightPadding));return{timeRange:t,totalDuration:i,timelineStartX:o,pxPerMs:c,latestX:l,chartWidth:d}}computeVerticalLayout(e){const t=this.getTimeRange(),i=Math.max(1,t.end.getTime()-t.start.getTime()),n=this.scrollArea.clientWidth||this.minChartWidth,s=this.scrollArea.clientHeight||this.minChartHeight,a=Math.max(this.minChartHeight,Math.ceil(i/e)),o=this.timeAxisHeight+10,c=a/i,l=o+i*c,d=Math.max(1,this.rows.length),u=d*this.sourceColumnWidth+Math.max(0,d-1)*this.sourceColumnGap,m=this.sourceAxisWidth,p=Math.max(n+this.rightPadding,m+u+this.rightPadding),g=Math.max(s+this.rightPadding,Math.ceil(l+this.rightPadding));return{timeRange:t,totalDuration:i,timelineStartY:o,pxPerMs:c,latestY:l,chartWidth:p,chartHeight:g,timelineStartX:m,columnWidth:this.sourceColumnWidth,columnGap:this.sourceColumnGap}}async loadData(){var e,t;if(!(this.isLoading||this.disposed)){this.isLoading=!0,this.showLoading();try{const i=await this.client.getProjects(),n=[];for(const s of i)if(s.id)try{const a=await this.client.getSessions(s.id);for(const o of a)o.modifiedAt&&n.push({session:o,projectId:s.id,projectName:s.name||"Unknown",projectPath:s.path??null,source:o.source||s.source||"unknown",timestamp:o.modifiedAt instanceof Date?o.modifiedAt:new Date(o.modifiedAt)})}catch{}n.sort((s,a)=>s.timestamp.getTime()-a.timestamp.getTime()),this.allSessions=n,this.applyFilters()}catch(i){const n=i instanceof Error?i:new Error(String(i));this.showError(n),(t=(e=this.options).onError)==null||t.call(e,n)}finally{this.isLoading=!1}}}applyFilters(){if(this.isLoading&&this.allSessions.length===0)return;const e=this.searchQuery.trim(),t=this.sourceFilter;this.sessions=this.allSessions.filter(i=>{var n;return t&&i.source.toLowerCase()!==t?!1:e?i.projectName.toLowerCase().includes(e)||i.source.toLowerCase().includes(e)||(((n=i.projectPath)==null?void 0:n.toLowerCase().includes(e))??!1):!0}),this.processRows(),this.hasInitialAlignment=!1,this.pendingZoomAnchor=null,this.render()}processRows(){var t;const e=new Map;for(const i of this.sessions){const n=this.groupBy==="project"?`project:${i.projectId}`:`source:${i.source.toLowerCase()}`;e.has(n)||e.set(n,{projectId:this.groupBy==="project"?i.projectId:null,projectPath:this.groupBy==="project"?i.projectPath:null,label:this.groupBy==="project"?i.projectName:i.source,sessions:[]}),(t=e.get(n))==null||t.sessions.push(i)}this.rows=Array.from(e.values()).map(i=>({projectId:i.projectId,projectPath:i.projectPath,label:i.label,sessions:i.sessions.sort((n,s)=>n.timestamp.getTime()-s.timestamp.getTime()),color:this.groupBy==="source"?this.getSourceColor(i.label):this.getDefaultColor(i.label)})),this.rows.sort((i,n)=>{var o,c;const s=((o=i.sessions[i.sessions.length-1])==null?void 0:o.timestamp.getTime())||0;return(((c=n.sessions[n.sessions.length-1])==null?void 0:c.timestamp.getTime())||0)-s})}getSourceColor(e){const t=e.toLowerCase();return si[t]||this.getDefaultColor(e)}getDefaultColor(e){const t=["#6366f1","#d97750","#19c39b","#f59e0b","#ec4899","#8b5cf6","#06b6d4","#84cc16","#f97316","#ef4444"];let i=0;for(let n=0;n<e.length;n++)i=e.charCodeAt(n)+((i<<5)-i);return t[Math.abs(i)%t.length]}render(){if(this.sessions.length===0){this.showEmpty();return}if(this.scrollArea.innerHTML="",this.labelTrack.innerHTML="",this.groupBy==="source"){this.labelOverlay.style.display="none",this.renderVerticalSourceTimeline();return}this.labelOverlay.style.display="block",this.renderHorizontalProjectTimeline()}renderHorizontalProjectTimeline(){const e=this.computeLayout(this.zoomMsPerPixel),t=a=>{const o=a.getTime()-e.timeRange.start.getTime();return e.timelineStartX+o*e.pxPerMs},i=document.createElement("div");i.className="thinkt-timeline-chart-content",i.style.width=`${e.chartWidth}px`;const n=document.createElement("div");n.className="thinkt-timeline-time-axis",n.style.height=`${this.timeAxisHeight}px`,n.style.width=`${e.chartWidth}px`;const s=Math.max(4,Math.floor(e.chartWidth/220));for(let a=0;a<=s;a++){const o=new Date(e.timeRange.start.getTime()+(e.timeRange.end.getTime()-e.timeRange.start.getTime())*a/s),c=document.createElement("span");c.className="thinkt-timeline-time-label",c.style.left=`${t(o)}px`,c.textContent=this.formatTime(o),n.appendChild(c)}i.appendChild(n),this.rows.forEach(a=>{const o=document.createElement("div");o.className="thinkt-timeline-chart-row",o.style.width=`${e.chartWidth}px`;const c=document.createElementNS("http://www.w3.org/2000/svg","svg");c.setAttribute("class","thinkt-timeline-chart-svg"),c.setAttribute("width",String(e.chartWidth)),c.setAttribute("height",String(this.rowHeight));const l=this.rowHeight/2,d=document.createElementNS("http://www.w3.org/2000/svg","line");d.setAttribute("x1",String(e.timelineStartX)),d.setAttribute("y1",String(l)),d.setAttribute("x2",String(e.latestX)),d.setAttribute("y2",String(l)),d.setAttribute("stroke","var(--thinkt-border-color, #333)"),d.setAttribute("stroke-opacity","0.3"),c.appendChild(d);for(let u=0;u<a.sessions.length-1;u++){const m=a.sessions[u],p=a.sessions[u+1],g=document.createElementNS("http://www.w3.org/2000/svg","line");g.setAttribute("x1",String(t(m.timestamp))),g.setAttribute("y1",String(l)),g.setAttribute("x2",String(t(p.timestamp))),g.setAttribute("y2",String(l)),g.setAttribute("stroke",a.color),g.setAttribute("stroke-width","2"),g.setAttribute("opacity","0.35"),c.appendChild(g)}a.sessions.forEach(u=>{const m=document.createElementNS("http://www.w3.org/2000/svg","circle");m.setAttribute("cx",String(t(u.timestamp))),m.setAttribute("cy",String(l)),m.setAttribute("r",String(this.blobRadius)),m.setAttribute("fill",a.color),m.setAttribute("stroke","var(--thinkt-bg-color, #1a1a1a)"),m.setAttribute("stroke-width","2"),m.setAttribute("cursor","pointer"),m.addEventListener("mouseenter",p=>{m.setAttribute("r",String(this.blobRadius+2)),this.showTooltip(p,u)}),m.addEventListener("mouseleave",()=>{m.setAttribute("r",String(this.blobRadius)),this.hideTooltip()}),m.addEventListener("click",()=>{var p,g;(g=(p=this.options).onSessionSelect)==null||g.call(p,u.session)}),c.appendChild(m)}),o.appendChild(c),i.appendChild(o)}),this.renderLabelOverlay(),this.scrollArea.appendChild(i),this.updateLabelTrackPosition(),window.requestAnimationFrame(()=>{var a;if(!this.disposed)if(((a=this.pendingZoomAnchor)==null?void 0:a.axis)==="x"){const o=e.timelineStartX+(this.pendingZoomAnchor.timeMs-e.timeRange.start.getTime())*e.pxPerMs;this.scrollArea.scrollLeft=Math.max(0,o-this.pendingZoomAnchor.viewportCoord),this.pendingZoomAnchor=null,this.hasInitialAlignment=!0}else this.hasInitialAlignment?this.pendingZoomAnchor&&(this.pendingZoomAnchor=null):(this.scrollArea.scrollLeft=Math.max(0,this.scrollArea.scrollWidth-this.scrollArea.clientWidth),this.hasInitialAlignment=!0)})}renderVerticalSourceTimeline(){const e=this.computeVerticalLayout(this.zoomMsPerPixel),t=u=>{const m=e.timeRange.end.getTime()-u.getTime();return e.timelineStartY+m*e.pxPerMs},i=u=>e.timelineStartX+u*(e.columnWidth+e.columnGap)+e.columnWidth/2,n=e.timelineStartX+Math.max(1,this.rows.length)*e.columnWidth+Math.max(0,this.rows.length-1)*e.columnGap,s=document.createElement("div");s.className="thinkt-timeline-chart-content thinkt-timeline-source-content",s.style.width=`${e.chartWidth}px`,s.style.height=`${e.chartHeight}px`;const a=document.createElement("div");a.className="thinkt-timeline-source-header",a.style.width=`${e.chartWidth}px`,a.style.height=`${this.timeAxisHeight}px`;const o=document.createElement("div");o.className="thinkt-timeline-source-axis-corner",o.style.width=`${e.timelineStartX}px`,a.appendChild(o),this.rows.forEach((u,m)=>{const p=document.createElement("span");p.className="thinkt-timeline-source-header-label",p.style.left=`${i(m)}px`,p.title=u.label,p.textContent=this.truncateLabel(u.label,16),a.appendChild(p)}),s.appendChild(a);const c=Math.max(4,Math.floor(e.chartHeight/180));for(let u=0;u<=c;u++){const m=new Date(e.timeRange.end.getTime()-(e.timeRange.end.getTime()-e.timeRange.start.getTime())*u/c),p=t(m),g=document.createElement("span");g.className="thinkt-timeline-source-time-label",g.style.top=`${p}px`,g.textContent=this.formatTime(m),s.appendChild(g)}const l=document.createElementNS("http://www.w3.org/2000/svg","svg");l.setAttribute("class","thinkt-timeline-source-svg"),l.setAttribute("width",String(e.chartWidth)),l.setAttribute("height",String(e.chartHeight));const d=document.createElementNS("http://www.w3.org/2000/svg","line");d.setAttribute("x1",String(e.timelineStartX)),d.setAttribute("y1",String(e.timelineStartY)),d.setAttribute("x2",String(e.timelineStartX)),d.setAttribute("y2",String(e.latestY)),d.setAttribute("stroke","var(--thinkt-border-color, #333)"),d.setAttribute("stroke-opacity","0.35"),l.appendChild(d);for(let u=0;u<=c;u++){const m=new Date(e.timeRange.end.getTime()-(e.timeRange.end.getTime()-e.timeRange.start.getTime())*u/c),p=t(m),g=document.createElementNS("http://www.w3.org/2000/svg","line");g.setAttribute("x1",String(e.timelineStartX)),g.setAttribute("y1",String(p)),g.setAttribute("x2",String(n)),g.setAttribute("y2",String(p)),g.setAttribute("stroke","var(--thinkt-border-color, #333)"),g.setAttribute("stroke-opacity","0.25"),l.appendChild(g)}this.rows.forEach((u,m)=>{const p=i(m),g=document.createElementNS("http://www.w3.org/2000/svg","line");g.setAttribute("x1",String(p)),g.setAttribute("y1",String(e.timelineStartY)),g.setAttribute("x2",String(p)),g.setAttribute("y2",String(e.latestY)),g.setAttribute("stroke","var(--thinkt-border-color, #333)"),g.setAttribute("stroke-opacity","0.25"),l.appendChild(g);for(let f=0;f<u.sessions.length-1;f++){const k=u.sessions[f],y=u.sessions[f+1],_=document.createElementNS("http://www.w3.org/2000/svg","line");_.setAttribute("x1",String(p)),_.setAttribute("y1",String(t(k.timestamp))),_.setAttribute("x2",String(p)),_.setAttribute("y2",String(t(y.timestamp))),_.setAttribute("stroke",u.color),_.setAttribute("stroke-width","2"),_.setAttribute("opacity","0.4"),l.appendChild(_)}u.sessions.forEach(f=>{const k=document.createElementNS("http://www.w3.org/2000/svg","circle");k.setAttribute("cx",String(p)),k.setAttribute("cy",String(t(f.timestamp))),k.setAttribute("r",String(this.blobRadius)),k.setAttribute("fill",u.color),k.setAttribute("stroke","var(--thinkt-bg-color, #1a1a1a)"),k.setAttribute("stroke-width","2"),k.setAttribute("cursor","pointer"),k.addEventListener("mouseenter",y=>{k.setAttribute("r",String(this.blobRadius+2)),this.showTooltip(y,f)}),k.addEventListener("mouseleave",()=>{k.setAttribute("r",String(this.blobRadius)),this.hideTooltip()}),k.addEventListener("click",()=>{var y,_;(_=(y=this.options).onSessionSelect)==null||_.call(y,f.session)}),l.appendChild(k)})}),s.appendChild(l),this.scrollArea.appendChild(s),window.requestAnimationFrame(()=>{var u;if(!this.disposed)if(((u=this.pendingZoomAnchor)==null?void 0:u.axis)==="y"){const m=e.timelineStartY+(e.timeRange.end.getTime()-this.pendingZoomAnchor.timeMs)*e.pxPerMs;this.scrollArea.scrollTop=Math.max(0,m-this.pendingZoomAnchor.viewportCoord),this.pendingZoomAnchor=null,this.hasInitialAlignment=!0}else this.hasInitialAlignment?this.pendingZoomAnchor&&(this.pendingZoomAnchor=null):(this.scrollArea.scrollTop=0,this.hasInitialAlignment=!0)})}renderLabelOverlay(){this.labelTrack.innerHTML="",this.rows.forEach((e,t)=>{const i=document.createElement("div");i.className="thinkt-timeline-label-item",i.style.top=`${t*this.rowHeight}px`,i.title=e.label,i.textContent=this.truncateLabel(e.label,18),this.groupBy==="project"&&e.projectId&&(i.classList.add("clickable"),i.addEventListener("click",()=>{var n,s;(s=(n=this.options).onProjectSelect)==null||s.call(n,{projectId:e.projectId,projectName:e.label,projectPath:e.projectPath})})),this.labelTrack.appendChild(i)})}getTimeRange(){const e=this.sessions.map(s=>s.timestamp.getTime()),t=Math.min(...e),i=Math.max(...e),n=(i-t)*.02||6e4;return{start:new Date(t-n),end:new Date(i)}}formatTime(e){const t=new Date;return e.toDateString()===t.toDateString()?e.toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit"}):e.toLocaleDateString(void 0,{month:"short",day:"numeric"})}showTooltip(e,t){var s;if(!this.tooltip)return;const i=t.session.firstPrompt?`${t.session.firstPrompt.slice(0,100)}${t.session.firstPrompt.length>100?"...":""}`:((s=t.session.id)==null?void 0:s.slice(0,8))||"Unknown";this.tooltip.innerHTML=`
      <div class="thinkt-timeline-tooltip-title">${this.escapeHtml(i)}</div>
      <div class="thinkt-timeline-tooltip-meta">
        ${this.escapeHtml(t.projectName)} · ${this.escapeHtml(t.source)} · ${t.timestamp.toLocaleString()}
      </div>
    `,this.tooltip.style.display="block";const n=e.target.getBoundingClientRect();this.tooltip.style.left=`${n.left}px`,this.tooltip.style.top=`${n.bottom+8}px`}hideTooltip(){this.tooltip&&(this.tooltip.style.display="none")}showLoading(){this.scrollArea.innerHTML=`
      <div class="thinkt-timeline-loading">
        <div>Loading timeline...</div>
      </div>
    `}showEmpty(){this.scrollArea.innerHTML=`
      <div class="thinkt-timeline-empty">
        <div>No sessions to display</div>
      </div>
    `}showError(e){this.scrollArea.innerHTML=`
      <div class="thinkt-timeline-error">
        <div>Error: ${this.escapeHtml(e.message)}</div>
      </div>
    `}truncateLabel(e,t){return e.length<=t?e:`${e.slice(0,t-3)}...`}escapeHtml(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}setGroupBy(e){this.groupBy!==e&&(this.groupBy=e,this.processRows(),this.hasInitialAlignment=!1,this.pendingZoomAnchor=null,this.render())}setSearch(e){this.searchQuery=e.trim().toLowerCase(),this.applyFilters()}setSourceFilter(e){this.sourceFilter=(e==null?void 0:e.trim().toLowerCase())||null,this.applyFilters()}refresh(){return this.loadData()}dispose(){this.disposed||(this.disposed=!0,this.rafScrollSync!==0&&(window.cancelAnimationFrame(this.rafScrollSync),this.rafScrollSync=0),this.scrollArea.removeEventListener("scroll",this.handleScroll),this.scrollArea.removeEventListener("wheel",this.handleWheel),this.scrollArea.removeEventListener("keydown",this.handleKeyDown),this.tooltip&&(this.tooltip.remove(),this.tooltip=null),this.container.innerHTML="")}}const ai=`
.thinkt-project-timeline {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: var(--thinkt-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
  color: var(--thinkt-text-color, #e0e0e0);
  background: var(--thinkt-bg-secondary, #141414);
  border-top: 1px solid var(--thinkt-border-color, #2a2a2a);
}

.thinkt-project-timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--thinkt-border-color, #2a2a2a);
  background: var(--thinkt-bg-tertiary, #1a1a1a);
  flex-shrink: 0;
}

.thinkt-project-timeline-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--thinkt-muted-color, #888);
  display: flex;
  align-items: center;
  gap: 8px;
}

.thinkt-project-timeline-close {
  background: none;
  border: none;
  color: var(--thinkt-muted-color, #666);
  cursor: pointer;
  font-size: 16px;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1;
}

.thinkt-project-timeline-close:hover {
  background: var(--thinkt-hover-bg, #252525);
  color: var(--thinkt-text-secondary, #a0a0a0);
}

.thinkt-project-timeline-content {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.thinkt-project-timeline-svg {
  width: 100%;
  min-width: 400px;
}

/* Legend */
.thinkt-project-timeline-legend {
  display: flex;
  gap: 16px;
  padding: 8px 12px;
  border-top: 1px solid var(--thinkt-border-color, #2a2a2a);
  font-size: 11px;
  color: var(--thinkt-text-secondary, #a0a0a0);
  flex-wrap: wrap;
  flex-shrink: 0;
}

.thinkt-project-timeline-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.thinkt-project-timeline-legend-start {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid currentColor;
}

.thinkt-project-timeline-legend-end {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}

.thinkt-project-timeline-legend-line {
  width: 20px;
  height: 2px;
  background: currentColor;
}

/* Empty & Loading */
.thinkt-project-timeline-empty,
.thinkt-project-timeline-loading,
.thinkt-project-timeline-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--thinkt-muted-color, #666);
  font-size: 12px;
}

/* Tooltip */
.thinkt-project-timeline-tooltip {
  position: absolute;
  background: var(--thinkt-bg-secondary, #1a1a1a);
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 12px;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  max-width: 280px;
}

.thinkt-project-timeline-tooltip-title {
  font-weight: 500;
  color: var(--thinkt-text-primary, #f0f0f0);
  margin-bottom: 4px;
  line-height: 1.3;
}

.thinkt-project-timeline-tooltip-meta {
  color: var(--thinkt-muted-color, #888);
  font-size: 11px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.thinkt-project-timeline-tooltip-duration {
  color: var(--thinkt-accent-color, #6366f1);
  font-weight: 500;
}
`;class li{constructor(e){h(this,"options");h(this,"client");h(this,"container");h(this,"contentContainer");h(this,"sessions",[]);h(this,"rows",[]);h(this,"svg",null);h(this,"tooltip",null);h(this,"isLoading",!1);h(this,"isVisible",!1);h(this,"stylesInjected",!1);h(this,"rowHeight",50);h(this,"blobRadius",7);h(this,"padding",{top:30,right:30,bottom:20,left:80});this.options=e,this.client=e.client??A(),this.container=e.elements.container,this.container.className="thinkt-project-timeline",this.contentContainer=document.createElement("div"),this.init()}init(){this.injectStyles(),this.createStructure(),this.tooltip=document.createElement("div"),this.tooltip.className="thinkt-project-timeline-tooltip",this.tooltip.style.display="none",document.body.appendChild(this.tooltip),this.options.projectId&&this.loadSessions(this.options.projectId)}injectStyles(){if(this.stylesInjected)return;const e="thinkt-project-timeline-styles";if(!document.getElementById(e)){const t=document.createElement("style");t.id=e,t.textContent=ai,document.head.appendChild(t)}this.stylesInjected=!0}createStructure(){this.container.innerHTML=`
      <div class="thinkt-project-timeline-header">
        <span class="thinkt-project-timeline-title">📊 Project Timeline</span>
        <button class="thinkt-project-timeline-close" title="Close">×</button>
      </div>
    `,this.contentContainer.className="thinkt-project-timeline-content",this.container.appendChild(this.contentContainer);const e=this.container.querySelector(".thinkt-project-timeline-close");e==null||e.addEventListener("click",()=>this.hide());const t=document.createElement("div");t.className="thinkt-project-timeline-legend",t.innerHTML=`
      <div class="thinkt-project-timeline-legend-item">
        <span class="thinkt-project-timeline-legend-start"></span>
        <span>Start</span>
      </div>
      <div class="thinkt-project-timeline-legend-item">
        <span class="thinkt-project-timeline-legend-end"></span>
        <span>End</span>
      </div>
      <div class="thinkt-project-timeline-legend-item">
        <span class="thinkt-project-timeline-legend-line"></span>
        <span>Session duration</span>
      </div>
    `,this.container.appendChild(t)}async loadSessions(e){var t,i;if(!this.isLoading){this.isLoading=!0,this.options.projectId=e,this.showLoading();try{const n=await this.client.getSessions(e);this.sessions=n.filter(s=>s.createdAt&&s.modifiedAt).map(s=>{const a=s.createdAt instanceof Date?s.createdAt:new Date(s.createdAt),o=s.modifiedAt instanceof Date?s.modifiedAt:new Date(s.modifiedAt);return{session:s,source:s.source||"unknown",startTime:a,endTime:o,duration:(o.getTime()-a.getTime())/(1e3*60)}}).sort((s,a)=>s.startTime.getTime()-a.startTime.getTime()),this.processRows(),this.render()}catch(n){const s=n instanceof Error?n:new Error(String(n));this.showError(s),(i=(t=this.options).onError)==null||i.call(t,s)}finally{this.isLoading=!1}}}processRows(){const e=new Map;for(const n of this.sessions)e.has(n.source)||e.set(n.source,[]),e.get(n.source).push(n);const t={claude:"#d97750",kimi:"#19c39b",gemini:"#6366f1",copilot:"#0078d4",thinkt:"#888888"};this.rows=Array.from(e.entries()).map(([n,s])=>({source:n,color:t[n.toLowerCase()]||"#6366f1",sessions:s.sort((a,o)=>a.startTime.getTime()-o.startTime.getTime())}));const i={claude:0,kimi:1,gemini:2,copilot:3,thinkt:4};this.rows.sort((n,s)=>(i[n.source]??99)-(i[s.source]??99))}render(){if(this.sessions.length===0){this.showEmpty();return}this.contentContainer.innerHTML="";const e=Math.max(400,this.contentContainer.clientWidth),t=this.padding.top+this.rows.length*this.rowHeight+this.padding.bottom;this.svg=document.createElementNS("http://www.w3.org/2000/svg","svg"),this.svg.setAttribute("class","thinkt-project-timeline-svg"),this.svg.setAttribute("viewBox",`0 0 ${e} ${t}`),this.svg.style.height=`${t}px`;const i=this.getTimeRange(),n=s=>{const a=(s.getTime()-i.start.getTime())/(i.end.getTime()-i.start.getTime());return this.padding.left+a*(e-this.padding.left-this.padding.right)};this.drawTimeAxis(e,i,n),this.rows.forEach((s,a)=>{this.drawRow(s,a,e,n)}),this.contentContainer.appendChild(this.svg)}getTimeRange(){const e=this.sessions.flatMap(s=>[s.startTime.getTime(),s.endTime.getTime()]),t=Math.min(...e),i=Math.max(...e),n=(i-t)*.1||6e4;return{start:new Date(t-n),end:new Date(i+n)}}drawTimeAxis(e,t,i){const n=document.createElementNS("http://www.w3.org/2000/svg","g");n.setAttribute("class","thinkt-project-timeline-axis");const s=this.padding.top-10,a=document.createElementNS("http://www.w3.org/2000/svg","line");a.setAttribute("x1",String(this.padding.left)),a.setAttribute("y1",String(s)),a.setAttribute("x2",String(e-this.padding.right)),a.setAttribute("y2",String(s)),a.setAttribute("stroke","var(--thinkt-border-color, #333)"),n.appendChild(a);const o=5;for(let c=0;c<=o;c++){const l=new Date(t.start.getTime()+(t.end.getTime()-t.start.getTime())*(c/o)),d=i(l),u=document.createElementNS("http://www.w3.org/2000/svg","text");u.setAttribute("x",String(d)),u.setAttribute("y",String(s-5)),u.setAttribute("fill","var(--thinkt-muted-color, #666)"),u.setAttribute("font-size","9"),u.setAttribute("text-anchor",c===0?"start":c===o?"end":"middle"),u.textContent=this.formatTime(l),n.appendChild(u);const m=document.createElementNS("http://www.w3.org/2000/svg","line");m.setAttribute("x1",String(d)),m.setAttribute("y1",String(s)),m.setAttribute("x2",String(d)),m.setAttribute("y2",String(s+4)),m.setAttribute("stroke","var(--thinkt-border-color, #333)"),n.appendChild(m)}this.svg.appendChild(n)}drawRow(e,t,i,n){const s=this.padding.top+t*this.rowHeight+this.rowHeight/2,a=document.createElementNS("http://www.w3.org/2000/svg","g");a.setAttribute("class","thinkt-project-timeline-row");const o=document.createElementNS("http://www.w3.org/2000/svg","text");o.setAttribute("x","10"),o.setAttribute("y",String(s+4)),o.setAttribute("fill","var(--thinkt-text-secondary, #a0a0a0)"),o.setAttribute("font-size","11"),o.setAttribute("font-weight","500"),o.setAttribute("text-anchor","start"),o.textContent=e.source.charAt(0).toUpperCase()+e.source.slice(1),a.appendChild(o);for(const c of e.sessions){const l=n(c.startTime),d=n(c.endTime),u=Math.abs(d-l)<4;if(!u){const p=document.createElementNS("http://www.w3.org/2000/svg","line");p.setAttribute("x1",String(l)),p.setAttribute("y1",String(s)),p.setAttribute("x2",String(d)),p.setAttribute("y2",String(s)),p.setAttribute("stroke",e.color),p.setAttribute("stroke-width","2"),p.setAttribute("opacity","0.4"),a.appendChild(p)}const m=document.createElementNS("http://www.w3.org/2000/svg","circle");if(m.setAttribute("cx",String(l)),m.setAttribute("cy",String(s)),m.setAttribute("r",String(this.blobRadius)),m.setAttribute("fill","var(--thinkt-bg-secondary, #141414)"),m.setAttribute("stroke",e.color),m.setAttribute("stroke-width","2"),m.setAttribute("cursor","pointer"),this.attachInteraction(m,c,"start"),a.appendChild(m),!u){const p=document.createElementNS("http://www.w3.org/2000/svg","circle");p.setAttribute("cx",String(d)),p.setAttribute("cy",String(s)),p.setAttribute("r",String(this.blobRadius)),p.setAttribute("fill",e.color),p.setAttribute("stroke",e.color),p.setAttribute("stroke-width","2"),p.setAttribute("cursor","pointer"),this.attachInteraction(p,c,"end"),a.appendChild(p)}}this.svg.appendChild(a)}attachInteraction(e,t,i){e.addEventListener("mouseenter",n=>{e.setAttribute("r",String(this.blobRadius+2)),this.showTooltip(n,t,i)}),e.addEventListener("mouseleave",()=>{e.setAttribute("r",String(this.blobRadius)),this.hideTooltip()}),e.addEventListener("click",()=>{var n,s;(s=(n=this.options).onSessionSelect)==null||s.call(n,t.session)})}showTooltip(e,t,i){var c;if(!this.tooltip)return;const n=t.session.firstPrompt?t.session.firstPrompt.slice(0,80)+(t.session.firstPrompt.length>80?"...":""):((c=t.session.id)==null?void 0:c.slice(0,8))||"Unknown",s=i==="start"?"Started":"Ended",a=i==="start"?t.startTime:t.endTime;this.tooltip.innerHTML=`
      <div class="thinkt-project-timeline-tooltip-title">${this.escapeHtml(n)}</div>
      <div class="thinkt-project-timeline-tooltip-meta">
        <span>${s}: ${a.toLocaleString()}</span>
        <span class="thinkt-project-timeline-tooltip-duration">
          Duration: ${this.formatDuration(t.duration)}
        </span>
        <span>Source: ${t.source}</span>
      </div>
    `,this.tooltip.style.display="block";const o=e.target.getBoundingClientRect();this.tooltip.style.left=`${o.left}px`,this.tooltip.style.top=`${o.bottom+8}px`}hideTooltip(){this.tooltip&&(this.tooltip.style.display="none")}formatTime(e){return e.toLocaleTimeString(void 0,{hour:"2-digit",minute:"2-digit",hour12:!1})}formatDuration(e){if(e<1)return"< 1 min";if(e<60)return`${Math.round(e)} min`;const t=Math.floor(e/60),i=Math.round(e%60);return`${t}h ${i}m`}showLoading(){this.contentContainer.innerHTML=`
      <div class="thinkt-project-timeline-loading">Loading timeline...</div>
    `}showEmpty(){this.contentContainer.innerHTML=`
      <div class="thinkt-project-timeline-empty">No sessions with timing data</div>
    `}showError(e){this.contentContainer.innerHTML=`
      <div class="thinkt-project-timeline-error">Error: ${this.escapeHtml(e.message)}</div>
    `}escapeHtml(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}show(){var t,i;const e=this.isVisible;this.isVisible=!0,this.container.style.display="flex",e||(i=(t=this.options).onVisibilityChange)==null||i.call(t,!0),this.options.projectId&&this.loadSessions(this.options.projectId)}hide(){var t,i;const e=this.isVisible;this.isVisible=!1,this.container.style.display="none",e&&((i=(t=this.options).onVisibilityChange)==null||i.call(t,!1))}isShown(){return this.isVisible}setProject(e){this.options.projectId=e,this.isVisible&&this.loadSessions(e)}dispose(){this.tooltip&&(this.tooltip.remove(),this.tooltip=null),this.container.innerHTML=""}}const ci=`
.thinkt-api-viewer {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: var(--thinkt-bg-color, #0a0a0a);
}

.thinkt-api-viewer__sidebar {
  display: flex;
  flex-direction: column;
  width: 380px;
  min-width: 280px;
  max-width: 500px;
  border-right: 1px solid var(--thinkt-border-color, #2a2a2a);
  background: var(--thinkt-sidebar-bg, #141414);
  padding-top: 40px; /* Space for fixed header (brand/status) */
}

.thinkt-project-browser,
.thinkt-session-list {
  background: transparent !important;
}

.thinkt-api-viewer__projects {
  flex: 0 0 auto;
  height: 45%;
  min-height: 150px;
  border-bottom: 1px solid var(--thinkt-border-color, #2a2a2a);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.thinkt-api-viewer__projects.full-height {
  flex: 1;
  height: auto;
}

.thinkt-api-viewer__projects.hidden {
  display: none;
}

.thinkt-api-viewer__sessions {
  flex: 1;
  overflow: hidden;
  min-height: 200px;
}

.thinkt-api-viewer__sessions.hidden {
  display: none;
}

.thinkt-api-viewer__viewer {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--thinkt-bg-color, #0a0a0a);
  display: flex;
  flex-direction: column;
}

.thinkt-api-viewer__conversation {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.thinkt-api-viewer__timeline-panel {
  height: 200px;
  min-height: 150px;
  max-height: 400px;
  border-top: 1px solid var(--thinkt-border-color, #2a2a2a);
  background: var(--thinkt-bg-secondary, #141414);
  flex-shrink: 0;
  display: none;
}

.thinkt-api-viewer__timeline-panel.visible {
  display: flex;
}

.thinkt-api-viewer__resizer {
  width: 4px;
  background: var(--thinkt-border-color, #2a2a2a);
  cursor: col-resize;
  transition: background 0.15s ease;
}

.thinkt-api-viewer__resizer:hover,
.thinkt-api-viewer__resizer.resizing {
  background: var(--thinkt-accent-color, #6366f1);
}

/* View Switcher */
.thinkt-view-switcher {
  display: flex;
  padding: 6px 8px;
  border-bottom: 1px solid var(--thinkt-border-color, #2a2a2a);
  background: var(--thinkt-bg-secondary, #141414);
  gap: 4px;
}

.thinkt-view-switcher-btn {
  flex: 1;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--thinkt-text-muted, #666);
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.thinkt-view-switcher-btn:hover {
  background: var(--thinkt-bg-hover, #252525);
  color: var(--thinkt-text-secondary, #a0a0a0);
}

.thinkt-view-switcher-btn.active {
  background: var(--thinkt-accent-color, #6366f1);
  color: white;
}

.thinkt-view-switcher-btn .icon {
  font-size: 10px;
}

.thinkt-project-filter {
  display: flex;
  gap: 6px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--thinkt-border-color, #2a2a2a);
  background: var(--thinkt-bg-secondary, #141414);
}

.thinkt-project-filter__search,
.thinkt-project-filter__source {
  border: 1px solid var(--thinkt-border-color, #333);
  border-radius: 4px;
  background: var(--thinkt-input-bg, #252525);
  color: var(--thinkt-text-color, #e0e0e0);
  font-size: 12px;
  padding: 6px 8px;
}

.thinkt-project-filter__search {
  flex: 1;
}

.thinkt-project-filter__search:focus,
.thinkt-project-filter__source:focus {
  outline: none;
  border-color: var(--thinkt-accent-color, #6366f1);
}

/* Responsive */
@media (max-width: 768px) {
  .thinkt-api-viewer__sidebar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 10;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .thinkt-api-viewer__sidebar--open {
    transform: translateX(0);
  }
  
  .thinkt-api-viewer__resizer {
    display: none;
  }
}
`;class hi{constructor(e){h(this,"elements");h(this,"options");h(this,"client");h(this,"projectBrowser",null);h(this,"treeProjectBrowser",null);h(this,"timelineVisualization",null);h(this,"sessionList",null);h(this,"conversationView",null);h(this,"projectTimelinePanel",null);h(this,"currentProject",null);h(this,"currentSession",null);h(this,"currentProjectView","list");h(this,"projectFilterContainer",null);h(this,"projectSearchInput",null);h(this,"projectSourceFilter",null);h(this,"projectSearchQuery","");h(this,"projectSource","");h(this,"isLoadingSession",!1);h(this,"boundHandlers",[]);h(this,"disposed",!1);h(this,"stylesInjected",!1);this.elements=e.elements,this.options=e,this.client=e.client??A(),this.currentProjectView=e.initialProjectView??"list",this.init()}init(){this.injectStyles(),this.createStructure(),this.initializeComponentsAsync()}injectStyles(){if(this.stylesInjected)return;const e="thinkt-api-viewer-styles";if(!document.getElementById(e)){const t=document.createElement("style");t.id=e,t.textContent=ci,document.head.appendChild(t)}this.stylesInjected=!0}createStructure(){const{container:e}=this.elements;e.className="thinkt-api-viewer";const t=document.createElement("div");t.className="thinkt-api-viewer__sidebar";const i=this.createViewSwitcher();t.appendChild(i),this.projectFilterContainer=this.createProjectFilterBar(),t.appendChild(this.projectFilterContainer);const n=document.createElement("div");n.className="thinkt-api-viewer__projects",n.id="projects-section",n.appendChild(this.elements.projectBrowserContainer),t.appendChild(n);const s=document.createElement("div");if(s.className="thinkt-api-viewer__sessions",s.id="sessions-section",s.appendChild(this.elements.sessionListContainer),t.appendChild(s),e.appendChild(t),this.elements.resizer)e.appendChild(this.elements.resizer);else{const c=document.createElement("div");c.className="thinkt-api-viewer__resizer",this.elements.resizer=c,e.appendChild(c),this.setupResizer()}const a=document.createElement("div");a.className="thinkt-api-viewer__viewer",this.elements.timelinePanelContainer||(this.elements.timelinePanelContainer=document.createElement("div"),this.elements.timelinePanelContainer.className="thinkt-api-viewer__timeline-panel",this.elements.timelinePanelContainer.style.display="none",this.elements.timelinePanelContainer.style.height="200px",this.elements.timelinePanelContainer.style.flexShrink="0");const o=document.createElement("div");o.className="thinkt-api-viewer__conversation",o.style.flex="1",o.style.overflow="hidden",o.appendChild(this.elements.viewerContainer),a.style.display="flex",a.style.flexDirection="column",a.appendChild(o),a.appendChild(this.elements.timelinePanelContainer),e.appendChild(a)}createViewSwitcher(){const e=document.createElement("div");return e.className="thinkt-view-switcher",[{id:"list",label:"List",icon:"☰"},{id:"tree",label:"Tree",icon:"🌳"},{id:"timeline",label:"Timeline",icon:"◯"}].forEach(i=>{const n=document.createElement("button");n.className=`thinkt-view-switcher-btn ${this.currentProjectView===i.id?"active":""}`,n.innerHTML=`<span class="icon">${i.icon}</span> ${i.label}`,n.addEventListener("click",()=>this.switchProjectView(i.id)),e.appendChild(n)}),e}createProjectFilterBar(){const e=document.createElement("div");e.className="thinkt-project-filter";const t=document.createElement("input");t.className="thinkt-project-filter__search",t.type="text",t.placeholder="Filter projects...",t.value=this.projectSearchQuery,this.projectSearchInput=t;const i=document.createElement("select");i.className="thinkt-project-filter__source",i.innerHTML=`
      <option value="">All Sources</option>
      <option value="claude">Claude</option>
      <option value="kimi">Kimi</option>
      <option value="gemini">Gemini</option>
      <option value="copilot">Copilot</option>
      <option value="thinkt">Thinkt</option>
    `,i.value=this.projectSource,this.projectSourceFilter=i;const n=()=>{this.projectSearchQuery=t.value,this.applyProjectFilters()};t.addEventListener("input",n),this.boundHandlers.push(()=>t.removeEventListener("input",n));const s=()=>{this.projectSource=i.value,this.applyProjectFilters()};return i.addEventListener("change",s),this.boundHandlers.push(()=>i.removeEventListener("change",s)),e.appendChild(t),e.appendChild(i),e}applyProjectFilters(){var n,s,a,o,c,l,d,u;const e=((n=this.projectSearchInput)==null?void 0:n.value)??this.projectSearchQuery,t=((s=this.projectSourceFilter)==null?void 0:s.value)||this.projectSource;this.projectSearchQuery=e,this.projectSource=t;const i=t||null;switch(this.currentProjectView){case"list":(a=this.projectBrowser)==null||a.setSearch(e),(o=this.projectBrowser)==null||o.setSourceFilter(i);break;case"tree":(c=this.treeProjectBrowser)==null||c.setSearch(e),(l=this.treeProjectBrowser)==null||l.setSourceFilter(i);break;case"timeline":(d=this.timelineVisualization)==null||d.setSearch(e),(u=this.timelineVisualization)==null||u.setSourceFilter(i);break}}setupResizer(){const{resizer:e,container:t}=this.elements;if(!e)return;const i=t.querySelector(".thinkt-api-viewer__sidebar");if(!i)return;let n=!1;const s=c=>{n=!0,document.body.style.cursor="col-resize",c.preventDefault()},a=c=>{if(!n)return;const l=c.clientX;l>=250&&l<=600&&(i.style.width=`${l}px`)},o=()=>{n=!1,document.body.style.cursor=""};e.addEventListener("mousedown",s),document.addEventListener("mousemove",a),document.addEventListener("mouseup",o),this.boundHandlers.push(()=>{e.removeEventListener("mousedown",s),document.removeEventListener("mousemove",a),document.removeEventListener("mouseup",o)})}switchProjectView(e){var s,a,o;if(this.currentProjectView===e)return;this.currentProjectView=e,this.elements.container.querySelectorAll(".thinkt-view-switcher-btn").forEach((c,l)=>{const d=["list","tree","timeline"];c.classList.toggle("active",d[l]===e)}),this.elements.projectBrowserContainer.innerHTML="",(s=this.projectBrowser)==null||s.dispose(),this.projectBrowser=null,(a=this.treeProjectBrowser)==null||a.dispose(),this.treeProjectBrowser=null,(o=this.timelineVisualization)==null||o.dispose(),this.timelineVisualization=null;const i=document.getElementById("projects-section"),n=document.getElementById("sessions-section");switch(e){case"list":i==null||i.classList.remove("full-height","hidden"),n==null||n.classList.remove("hidden"),this.initListView(),this.currentProject&&(this.currentProject.id?this.showProjectTimelinePanel(this.currentProject.id):this.hideProjectTimelinePanel());break;case"tree":i==null||i.classList.add("full-height"),i==null||i.classList.remove("hidden"),n==null||n.classList.add("hidden"),this.hideProjectTimelinePanel(),this.initTreeView();break;case"timeline":i==null||i.classList.add("full-height"),i==null||i.classList.remove("hidden"),n==null||n.classList.add("hidden"),this.hideProjectTimelinePanel(),this.initTimelineView();break}}async initListView(){this.projectBrowser=new nt({elements:{container:this.elements.projectBrowserContainer},client:this.client,enableSearch:!1,enableSourceFilter:!1,onProjectSelect:e=>{this.handleProjectSelect(e)},onError:e=>{this.handleError(e)}}),this.applyProjectFilters()}async initTreeView(){this.treeProjectBrowser=new ii({elements:{container:this.elements.projectBrowserContainer},client:this.client,onSessionSelect:(e,t)=>{this.handleTreeSessionSelect(e,t)},onError:e=>{this.handleError(e)}}),this.applyProjectFilters()}async initTimelineView(){this.timelineVisualization=new oi({elements:{container:this.elements.projectBrowserContainer},client:this.client,onProjectSelect:e=>{this.handleTimelineProjectSelect(e)},onSessionSelect:e=>{this.handleTimelineSessionSelect(e)},onError:e=>{this.handleError(e)}}),this.applyProjectFilters()}async initializeComponentsAsync(){switch(await this.checkConnection(),this.currentProjectView){case"list":default:await this.initListView();break;case"tree":await this.initTreeView();break;case"timeline":await this.initTimelineView();break}this.currentProjectView==="list"&&(this.sessionList=new at({elements:{container:this.elements.sessionListContainer},client:this.client,onSessionSelect:e=>{this.handleSessionSelect(e)},onError:e=>{this.handleError(e)}})),this.conversationView=new ei({elements:{container:this.elements.viewerContainer},client:this.client,onToggleTimelinePanel:()=>{this.handleTimelinePanelToggle()},isTimelinePanelVisible:()=>this.isTimelinePanelVisible(),canToggleTimelinePanel:()=>{var e;return!!((e=this.currentProject)!=null&&e.id)}}),this.elements.timelinePanelContainer&&(this.projectTimelinePanel=new li({elements:{container:this.elements.timelinePanelContainer},client:this.client,onSessionSelect:e=>{this.handleSessionSelect(e)},onVisibilityChange:e=>{this.handleTimelinePanelVisibilityChange(e)},onError:e=>{this.handleError(e)}}))}async checkConnection(){try{await this.client.getSources(),this.updateConnectionStatus(!0)}catch(e){this.updateConnectionStatus(!1,e instanceof Error?e.message:"Connection failed")}}updateConnectionStatus(e,t){const i=document.getElementById("global-status");if(!i)return;i.classList.remove("connected","error","connecting"),i.classList.add(e?"connected":"error");const n=i.querySelector(".status-text");n&&(n.textContent=e?"Connected":t??"Disconnected")}handleProjectSelect(e){var t,i,n;this.currentProject=e,e.id&&((t=this.sessionList)==null||t.setProjectId(e.id)),(i=this.conversationView)==null||i.setProjectPath(e.path??e.name??null,0),this.currentProjectView==="list"&&e.id&&this.showProjectTimelinePanel(e.id),(n=this.conversationView)==null||n.refreshToolbar()}async handleTreeSessionSelect(e,t){var i,n;(i=this.conversationView)==null||i.setProjectPath(t.name,0),e.fullPath&&await this.loadSession(e.fullPath),(n=this.conversationView)==null||n.refreshToolbar()}async handleTimelineSessionSelect(e){var t,i;(t=this.conversationView)==null||t.setProjectPath(e.projectPath??null,0),e.fullPath&&await this.loadSession(e.fullPath),(i=this.conversationView)==null||i.refreshToolbar()}handleTimelineProjectSelect(e){var i,n,s,a,o;const t=((i=this.currentProject)==null?void 0:i.id)===e.projectId;if(this.showProjectTimelinePanel(e.projectId),t&&this.currentSession){(n=this.conversationView)==null||n.refreshToolbar();return}this.currentProject={id:e.projectId,name:e.projectName,path:e.projectPath??void 0},this.currentSession=null,(s=this.conversationView)==null||s.setProjectPath(e.projectPath??e.projectName,0),(a=this.conversationView)==null||a.clear(),(o=this.conversationView)==null||o.refreshToolbar()}showProjectTimelinePanel(e){var t,i,n,s;(t=this.projectTimelinePanel)==null||t.setProject(e),(i=this.projectTimelinePanel)==null||i.show(),(n=this.elements.timelinePanelContainer)==null||n.classList.add("visible"),(s=this.conversationView)==null||s.refreshToolbar()}hideProjectTimelinePanel(){var e,t,i;(e=this.projectTimelinePanel)==null||e.hide(),(t=this.elements.timelinePanelContainer)==null||t.classList.remove("visible"),(i=this.conversationView)==null||i.refreshToolbar()}handleTimelinePanelVisibilityChange(e){var t,i;(t=this.elements.timelinePanelContainer)==null||t.classList.toggle("visible",e),(i=this.conversationView)==null||i.refreshToolbar()}isTimelinePanelVisible(){var e;return((e=this.elements.timelinePanelContainer)==null?void 0:e.classList.contains("visible"))??!1}handleTimelinePanelToggle(){var e;(e=this.currentProject)!=null&&e.id&&(this.isTimelinePanelVisible()?this.hideProjectTimelinePanel():this.showProjectTimelinePanel(this.currentProject.id))}async handleSessionSelect(e){var t,i,n;if(!this.isLoadingSession){this.isLoadingSession=!0;try{const s=e.fullPath;if(!s)throw new Error("Session has no path");const a=await this.client.getAllSessionEntries(s);this.currentSession={meta:e,entries:a},(t=this.conversationView)==null||t.displayEntries(a),Promise.resolve((n=(i=this.options).onSessionLoaded)==null?void 0:n.call(i,e,a))}catch(s){this.handleError(s instanceof Error?s:new Error(String(s)))}finally{this.isLoadingSession=!1}}}handleError(e){var t,i;console.error("ApiViewer error:",e),(i=(t=this.options).onError)==null||i.call(t,e),this.updateConnectionStatus(!1,e.message)}getCurrentProject(){return this.currentProject}getCurrentSession(){return this.currentSession}async loadSession(e){const t=await this.client.getSession(e);await this.handleSessionSelect(t.meta)}refreshProjects(){var e,t,i;switch(this.currentProjectView){case"list":return((e=this.projectBrowser)==null?void 0:e.refresh())??Promise.resolve();case"tree":return((t=this.treeProjectBrowser)==null?void 0:t.refresh())??Promise.resolve();case"timeline":return((i=this.timelineVisualization)==null?void 0:i.refresh())??Promise.resolve();default:return Promise.resolve()}}setProjectView(e){this.switchProjectView(e)}getProjectView(){return this.currentProjectView}getProjectBrowser(){return this.projectBrowser}getTreeProjectBrowser(){return this.treeProjectBrowser}getTimelineVisualization(){return this.timelineVisualization}getProjectTimelinePanel(){return this.projectTimelinePanel}getSessionList(){return this.sessionList}getConversationView(){return this.conversationView}focusProjectSearch(){var e;(e=this.projectSearchInput)==null||e.focus()}focusSessionSearch(){var e;(e=this.sessionList)==null||e.focusSearch()}async selectProject(e){var i,n,s,a;const t=(i=this.projectBrowser)==null?void 0:i.getProjects().find(o=>o.id===e);if(t)(n=this.projectBrowser)==null||n.selectProjectById(e),this.handleProjectSelect(t);else{await this.refreshProjects();const o=(s=this.projectBrowser)==null?void 0:s.getProjects().find(c=>c.id===e);o&&((a=this.projectBrowser)==null||a.selectProjectById(e),this.handleProjectSelect(o))}}selectSessionById(e){var t;(t=this.sessionList)==null||t.selectSessionById(e)}scrollToEntry(e){var t;(t=this.conversationView)==null||t.scrollToEntry(e)}dispose(){var e,t,i,n,s,a;this.disposed||(this.boundHandlers.forEach(o=>o()),this.boundHandlers=[],(e=this.projectBrowser)==null||e.dispose(),(t=this.treeProjectBrowser)==null||t.dispose(),(i=this.timelineVisualization)==null||i.dispose(),(n=this.sessionList)==null||n.dispose(),(s=this.conversationView)==null||s.dispose(),(a=this.projectTimelinePanel)==null||a.dispose(),this.projectBrowser=null,this.treeProjectBrowser=null,this.timelineVisualization=null,this.sessionList=null,this.conversationView=null,this.projectTimelinePanel=null,this.currentProject=null,this.currentSession=null,this.projectFilterContainer=null,this.projectSearchInput=null,this.projectSourceFilter=null,this.disposed=!0)}}const di=`
.thinkt-search-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  animation: thinkt-search-fade-in 0.15s ease;
}

.thinkt-search-overlay.closing {
  animation: thinkt-search-fade-out 0.15s ease forwards;
}

@keyframes thinkt-search-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes thinkt-search-fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

.thinkt-search-modal {
  width: 85%;
  max-width: 1200px;
  max-height: 70vh;
  background: var(--bg-secondary, #141414);
  border: 1px solid var(--border-color, #2a2a2a);
  border-radius: var(--radius-lg, 8px);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: thinkt-search-slide-in 0.2s ease;
}

@keyframes thinkt-search-slide-in {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.thinkt-search-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color, #2a2a2a);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.thinkt-search-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #f0f0f0);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.thinkt-search-title kbd {
  font-family: var(--font-mono, monospace);
  font-size: 11px;
  font-weight: normal;
  padding: 2px 6px;
  background: var(--bg-tertiary, #1a1a1a);
  border: 1px solid var(--border-color-light, #333);
  border-radius: var(--radius-sm, 4px);
  color: var(--text-muted, #666);
}

.thinkt-search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.thinkt-search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted, #666);
  font-size: 16px;
  pointer-events: none;
}

.thinkt-search-input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  background: var(--bg-tertiary, #1a1a1a);
  border: 1px solid var(--border-color-light, #333);
  border-radius: var(--radius-md, 6px);
  color: var(--text-primary, #f0f0f0);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s ease;
}

.thinkt-search-input:focus {
  border-color: var(--accent-primary, #6366f1);
}

.thinkt-search-input::placeholder {
  color: var(--text-muted, #666);
}

.thinkt-search-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
}

.thinkt-search-option {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary, #a0a0a0);
  cursor: pointer;
  user-select: none;
}

.thinkt-search-option input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: var(--accent-primary, #6366f1);
  cursor: pointer;
}

.thinkt-search-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.thinkt-search-projects {
  width: 220px;
  min-width: 220px;
  border-right: 1px solid var(--border-color, #2a2a2a);
  background: var(--bg-tertiary, #1a1a1a);
  display: flex;
  flex-direction: column;
}

.thinkt-search-projects-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #2a2a2a);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted, #666);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.thinkt-search-projects-actions {
  display: flex;
  gap: 4px;
}

.thinkt-search-projects-actions button {
  background: none;
  border: none;
  color: var(--accent-primary, #6366f1);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.thinkt-search-projects-actions button:hover {
  background: var(--bg-hover, #252525);
}

.thinkt-search-projects-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.thinkt-search-project-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary, #a0a0a0);
  transition: background-color 0.12s ease;
}

.thinkt-search-project-item:hover {
  background: var(--bg-hover, #252525);
}

.thinkt-search-project-item input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: var(--accent-primary, #6366f1);
  cursor: pointer;
  flex-shrink: 0;
}

.thinkt-search-project-item label {
  flex: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}

.thinkt-search-project-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thinkt-search-project-count {
  font-size: 10px;
  color: var(--text-muted, #666);
  background: var(--bg-secondary, #141414);
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;
}

.thinkt-search-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.thinkt-search-results {
  list-style: none;
  margin: 0;
  padding: 8px;
}

.thinkt-search-result {
  padding: 12px;
  border-radius: var(--radius-md, 6px);
  cursor: pointer;
  transition: background-color 0.12s ease;
  margin-bottom: 4px;
}

.thinkt-search-result:hover,
.thinkt-search-result.selected {
  background: var(--bg-hover, #252525);
}

.thinkt-search-result.selected {
  border-left: 2px solid var(--accent-primary, #6366f1);
  margin-left: -2px;
}

.thinkt-search-result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.thinkt-search-result-project {
  font-weight: 500;
  font-size: 13px;
  color: var(--text-primary, #f0f0f0);
}

.thinkt-search-result-sep {
  color: var(--text-muted, #666);
  font-size: 12px;
}

.thinkt-search-result-session {
  font-family: var(--font-mono, monospace);
  font-size: 12px;
  color: var(--text-secondary, #a0a0a0);
}

.thinkt-search-result-source {
  font-size: 10px;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: var(--radius-sm, 4px);
  font-weight: 600;
  letter-spacing: 0.3px;
}

.thinkt-search-result-source--claude {
  background: rgba(217, 119, 80, 0.15);
  color: #d97750;
}

.thinkt-search-result-source--kimi {
  background: rgba(25, 195, 155, 0.15);
  color: #19c39b;
}

.thinkt-search-result-source--gemini {
  background: rgba(99, 102, 241, 0.15);
  color: #6366f1;
}

.thinkt-search-result-matches {
  font-size: 12px;
  color: var(--text-muted, #666);
  margin-left: auto;
}

.thinkt-search-result-preview {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary, #a0a0a0);
  font-family: var(--font-mono, monospace);
  padding: 8px;
  background: var(--bg-tertiary, #1a1a1a);
  border-radius: var(--radius-sm, 4px);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.thinkt-search-result-preview mark {
  background: rgba(99, 102, 241, 0.3);
  color: var(--text-primary, #f0f0f0);
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: 600;
}

.thinkt-search-result-role {
  display: inline-block;
  font-size: 10px;
  color: var(--text-muted, #666);
  margin-right: 8px;
  text-transform: lowercase;
}

.thinkt-search-empty,
.thinkt-search-loading,
.thinkt-search-error {
  padding: 48px;
  text-align: center;
  color: var(--text-muted, #666);
}

.thinkt-search-empty-icon {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.thinkt-search-help {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color, #2a2a2a);
  font-size: 11px;
  color: var(--text-muted, #666);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.thinkt-search-help kbd {
  font-family: var(--font-mono, monospace);
  padding: 2px 4px;
  background: var(--bg-tertiary, #1a1a1a);
  border: 1px solid var(--border-color-light, #333);
  border-radius: var(--radius-sm, 4px);
  margin: 0 2px;
}

.thinkt-search-no-indexer {
  padding: 32px;
  text-align: center;
  color: var(--text-muted, #666);
}

.thinkt-search-no-indexer-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, #a0a0a0);
  margin-bottom: 8px;
}
`;class pi{constructor(e){h(this,"elements");h(this,"options");h(this,"client");h(this,"overlay",null);h(this,"input",null);h(this,"results",[]);h(this,"filteredResults",[]);h(this,"projects",new Map);h(this,"selectedProjects",new Set);h(this,"selectedIndex",-1);h(this,"isLoading",!1);h(this,"searchDebounceTimer",null);h(this,"boundHandlers",[]);h(this,"stylesInjected",!1);h(this,"isOpen",!1);h(this,"caseSensitive",!1);h(this,"useRegex",!1);this.elements=e.elements,this.options=e,this.client=e.client??A(),this.injectStyles()}injectStyles(){if(this.stylesInjected)return;const e="thinkt-search-overlay-styles";if(!document.getElementById(e)){const t=document.createElement("style");t.id=e,t.textContent=di,document.head.appendChild(t)}this.stylesInjected=!0}open(){var e;this.isOpen||(this.isOpen=!0,this.createOverlay(),this.attachListeners(),(e=this.input)==null||e.focus())}close(){!this.isOpen||!this.overlay||(this.isOpen=!1,this.overlay.classList.add("closing"),setTimeout(()=>{var e,t;this.cleanup(),(t=(e=this.options).onClose)==null||t.call(e)},150))}cleanup(){var e;this.boundHandlers.forEach(t=>t()),this.boundHandlers=[],this.searchDebounceTimer&&(clearTimeout(this.searchDebounceTimer),this.searchDebounceTimer=null),(e=this.overlay)==null||e.remove(),this.overlay=null,this.input=null,this.results=[],this.filteredResults=[],this.projects.clear(),this.selectedProjects.clear(),this.selectedIndex=-1}createOverlay(){this.overlay=document.createElement("div"),this.overlay.className="thinkt-search-overlay",this.overlay.innerHTML=`
      <div class="thinkt-search-modal">
        <div class="thinkt-search-header">
          <div class="thinkt-search-title">
            <span>Search Sessions</span>
            <kbd>esc</kbd>
          </div>
          <div class="thinkt-search-input-wrapper">
            <span class="thinkt-search-icon">🔍</span>
            <input type="text" class="thinkt-search-input" placeholder="Type to search across all sessions..." autocomplete="off">
          </div>
          <div class="thinkt-search-options">
            <label class="thinkt-search-option">
              <input type="checkbox" id="search-case-sensitive">
              <span>Case sensitive</span>
            </label>
            <label class="thinkt-search-option">
              <input type="checkbox" id="search-regex">
              <span>Regex</span>
            </label>
          </div>
        </div>
        <div class="thinkt-search-body">
          <div class="thinkt-search-projects" style="display: none;">
            <div class="thinkt-search-projects-header">
              <span>Projects</span>
              <div class="thinkt-search-projects-actions">
                <button id="search-select-all">All</button>
                <button id="search-select-none">None</button>
              </div>
            </div>
            <div class="thinkt-search-projects-list"></div>
          </div>
          <div class="thinkt-search-content">
            <div class="thinkt-search-empty">
              <div class="thinkt-search-empty-icon">🔍</div>
              <div>Type to search across all indexed sessions</div>
            </div>
          </div>
        </div>
        <div class="thinkt-search-help">
          <span><kbd>↑</kbd><kbd>↓</kbd> to navigate <kbd>↵</kbd> to select</span>
          <span>Search uses the indexer database</span>
        </div>
      </div>
    `,this.elements.container.appendChild(this.overlay),this.input=this.overlay.querySelector(".thinkt-search-input")}attachListeners(){if(!this.overlay)return;const e=s=>{s.target===this.overlay&&this.close()};if(this.overlay.addEventListener("click",e),this.boundHandlers.push(()=>{var s;return(s=this.overlay)==null?void 0:s.removeEventListener("click",e)}),this.input){const s=()=>this.handleSearchInput();this.input.addEventListener("input",s),this.boundHandlers.push(()=>{var o;return(o=this.input)==null?void 0:o.removeEventListener("input",s)});const a=o=>this.handleKeydown(o);this.input.addEventListener("keydown",a),this.boundHandlers.push(()=>{var o;return(o=this.input)==null?void 0:o.removeEventListener("keydown",a)})}const t=this.overlay.querySelector("#search-case-sensitive"),i=this.overlay.querySelector("#search-regex");if(t){const s=()=>{this.caseSensitive=t.checked,this.triggerSearch()};t.addEventListener("change",s),this.boundHandlers.push(()=>t.removeEventListener("change",s))}if(i){const s=()=>{this.useRegex=i.checked,this.triggerSearch()};i.addEventListener("change",s),this.boundHandlers.push(()=>i.removeEventListener("change",s))}const n=s=>{s.key==="Escape"&&(s.preventDefault(),this.close())};document.addEventListener("keydown",n),this.boundHandlers.push(()=>document.removeEventListener("keydown",n))}extractProjects(e){const t=new Map;for(const i of e){const n=i.project_name;if(!n)continue;const s=t.get(n);s?s.count++:t.set(n,{name:n,count:1,source:i.source??"claude"})}return t}renderProjects(){var a,o,c,l;const e=(a=this.overlay)==null?void 0:a.querySelector(".thinkt-search-projects"),t=(o=this.overlay)==null?void 0:o.querySelector(".thinkt-search-projects-list");if(!e||!t)return;if(this.projects.size===0){e.style.display="none";return}e.style.display="flex";const i=Array.from(this.projects.values()).sort((d,u)=>d.name.localeCompare(u.name));t.innerHTML="";for(const d of i){const u=document.createElement("div");u.className="thinkt-search-project-item";const m=this.selectedProjects.has(d.name);u.innerHTML=`
        <input type="checkbox" id="proj-${this.escapeHtml(d.name)}" ${m?"checked":""}>
        <label for="proj-${this.escapeHtml(d.name)}">
          <span class="thinkt-search-project-name" title="${this.escapeHtml(d.name)}">${this.escapeHtml(d.name)}</span>
          <span class="thinkt-search-project-count">${d.count}</span>
        </label>
      `;const p=u.querySelector("input");if(p){const f=()=>{p.checked?this.selectedProjects.add(d.name):this.selectedProjects.delete(d.name),this.applyProjectFilter()};p.addEventListener("change",f),this.boundHandlers.push(()=>p.removeEventListener("change",f))}const g=u.querySelector("label");g&&g.addEventListener("click",f=>{f.preventDefault(),p&&(p.checked=!p.checked,p.dispatchEvent(new Event("change")))}),t.appendChild(u)}const n=(c=this.overlay)==null?void 0:c.querySelector("#search-select-all");if(n){const d=()=>{if(this.selectedProjects.size===this.projects.size)this.selectedProjects.clear();else for(const m of this.projects.keys())this.selectedProjects.add(m);this.renderProjects(),this.applyProjectFilter()};n.addEventListener("click",d),this.boundHandlers.push(()=>n.removeEventListener("click",d))}const s=(l=this.overlay)==null?void 0:l.querySelector("#search-select-none");if(s){const d=()=>{this.selectedProjects.clear(),this.renderProjects(),this.applyProjectFilter()};s.addEventListener("click",d),this.boundHandlers.push(()=>s.removeEventListener("click",d))}}applyProjectFilter(){this.selectedProjects.size===0?this.filteredResults=[...this.results]:this.filteredResults=this.results.filter(e=>e.project_name&&this.selectedProjects.has(e.project_name)),this.selectedIndex=this.filteredResults.length>0?0:-1,this.renderResultsList()}handleSearchInput(){var t;this.searchDebounceTimer&&clearTimeout(this.searchDebounceTimer);const e=((t=this.input)==null?void 0:t.value.trim())??"";if(!e){this.showEmptyState();return}this.searchDebounceTimer=setTimeout(()=>{this.performSearch(e)},150)}triggerSearch(){var t;const e=((t=this.input)==null?void 0:t.value.trim())??"";e&&(this.searchDebounceTimer&&clearTimeout(this.searchDebounceTimer),this.searchDebounceTimer=setTimeout(()=>{this.performSearch(e)},150))}async performSearch(e){var t,i;if(!this.isLoading){this.isLoading=!0,this.showLoadingState();try{const n={query:e,limit:50,limitPerSession:2,caseSensitive:this.caseSensitive,regex:this.useRegex},s=await this.client.search(n);this.results=s.sessions??[],this.projects=this.extractProjects(this.results),this.selectedProjects=new Set(this.projects.keys()),this.filteredResults=[...this.results],this.selectedIndex=this.filteredResults.length>0?0:-1,this.renderProjects(),this.renderResultsList()}catch(n){const s=n instanceof Error?n:new Error(String(n));this.showErrorState(s),(i=(t=this.options).onError)==null||i.call(t,s)}finally{this.isLoading=!1}}}handleKeydown(e){switch(e.key){case"ArrowDown":e.preventDefault(),this.selectNext();break;case"ArrowUp":e.preventDefault(),this.selectPrevious();break;case"Enter":e.preventDefault(),this.selectCurrent();break}}selectNext(){this.filteredResults.length!==0&&(this.selectedIndex=(this.selectedIndex+1)%this.filteredResults.length,this.updateSelection())}selectPrevious(){this.filteredResults.length!==0&&(this.selectedIndex=this.selectedIndex<=0?this.filteredResults.length-1:this.selectedIndex-1,this.updateSelection())}selectCurrent(){if(this.selectedIndex>=0&&this.selectedIndex<this.filteredResults.length){const e=this.filteredResults[this.selectedIndex];e&&this.selectResult(e)}}updateSelection(){var t;const e=(t=this.overlay)==null?void 0:t.querySelectorAll(".thinkt-search-result");e==null||e.forEach((i,n)=>{i.classList.toggle("selected",n===this.selectedIndex),n===this.selectedIndex&&i.scrollIntoView({block:"nearest",behavior:"smooth"})})}showEmptyState(){var i,n;const e=(i=this.overlay)==null?void 0:i.querySelector(".thinkt-search-content"),t=(n=this.overlay)==null?void 0:n.querySelector(".thinkt-search-projects");e&&(t&&(t.style.display="none"),e.innerHTML=`
      <div class="thinkt-search-empty">
        <div class="thinkt-search-empty-icon">🔍</div>
        <div>Type to search across all indexed sessions</div>
      </div>
    `)}showLoadingState(){var t;const e=(t=this.overlay)==null?void 0:t.querySelector(".thinkt-search-content");e&&(e.innerHTML=`
      <div class="thinkt-search-loading">
        <div>Searching...</div>
      </div>
    `)}showErrorState(e){var n;const t=(n=this.overlay)==null?void 0:n.querySelector(".thinkt-search-content");if(!t)return;e.message.includes("indexer")||e.message.includes("503")?t.innerHTML=`
        <div class="thinkt-search-no-indexer">
          <div class="thinkt-search-no-indexer-title">Indexer not available</div>
          <div>The search feature requires the thinkt-indexer to be installed and configured.</div>
        </div>
      `:t.innerHTML=`
        <div class="thinkt-search-error">
          <div>Error: ${this.escapeHtml(e.message)}</div>
        </div>
      `}renderResultsList(){var i;const e=(i=this.overlay)==null?void 0:i.querySelector(".thinkt-search-content");if(!e)return;if(this.filteredResults.length===0){this.results.length===0?e.innerHTML=`
          <div class="thinkt-search-empty">
            <div class="thinkt-search-empty-icon">😕</div>
            <div>No results found</div>
          </div>
        `:e.innerHTML=`
          <div class="thinkt-search-empty">
            <div class="thinkt-search-empty-icon">📁</div>
            <div>No results for selected projects</div>
            <div style="font-size: 11px; margin-top: 8px;">Select projects from the sidebar to filter</div>
          </div>
        `;return}const t=document.createElement("ul");t.className="thinkt-search-results",this.filteredResults.forEach((n,s)=>{const a=this.createResultItem(n,s);t.appendChild(a)}),e.innerHTML="",e.appendChild(t),this.updateSelection()}createResultItem(e,t){const i=document.createElement("li");i.className="thinkt-search-result",t===this.selectedIndex&&i.classList.add("selected");const n=e.source??"claude",s=e.matches??[],a=s.length,o=s.map(c=>this.renderMatchPreview(c)).join("");return i.innerHTML=`
      <div class="thinkt-search-result-header">
        <span class="thinkt-search-result-project">${this.escapeHtml(e.project_name)}</span>
        <span class="thinkt-search-result-sep">·</span>
        <span class="thinkt-search-result-session">${this.escapeHtml(this.shortenId(e.session_id))}</span>
        <span class="thinkt-search-result-source thinkt-search-result-source--${n}">${n}</span>
        <span class="thinkt-search-result-matches">${a} match${a!==1?"es":""}</span>
      </div>
      ${o}
    `,i.addEventListener("click",()=>{this.selectResult(e)}),i.addEventListener("mouseenter",()=>{this.selectedIndex=t,this.updateSelection()}),i}renderMatchPreview(e){const t=e.preview??"",i=e.role??"unknown";return`
      <div class="thinkt-search-result-preview">
        <span class="thinkt-search-result-role">[${this.escapeHtml(i)}]:</span>
        ${this.escapeHtml(t)}
      </div>
    `}async selectResult(e){var t,i,n;try{const s=(t=e.matches)==null?void 0:t[0],a=s==null?void 0:s.line_num;await((n=(i=this.options).onSessionSelect)==null?void 0:n.call(i,e,a))}finally{this.close()}}escapeHtml(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}shortenId(e){return e?e.length>8?e.slice(0,8)+"...":e:""}isOpened(){return this.isOpen}dispose(){this.close()}}function Ve(){if(typeof window<"u"){const e=new URLSearchParams(window.location.search).get("api-url");if(e)try{return new URL(e),console.log("[THINKT] Using API URL from query parameter:",e),e}catch{console.error("[THINKT] Invalid API URL in query parameter:",e)}}if(typeof window<"u"&&window.THINKT_API_URL){const r=window.THINKT_API_URL;return console.log("[THINKT] Using API URL from global variable:",r),r}if(typeof document<"u"){const r=document.querySelector('meta[name="thinkt-api-url"]');if(r!=null&&r.getAttribute("content")){const e=r.getAttribute("content");return console.log("[THINKT] Using API URL from meta tag:",e),e}}return typeof window<"u"?(console.log("[THINKT] Using API URL from same origin:",window.location.origin),window.location.origin):(console.log("[THINKT] Using default API URL: http://localhost:8784"),"http://localhost:8784")}const Oe=["en","zh","es"],We="thinkt-locale";async function ui(){const r=localStorage.getItem(We);return r&&Oe.includes(r)?r:"en"}async function mi(r){localStorage.setItem(We,r)}let b=null,T=null,W=null;async function Ce(){const r=await ui();gi(r);const e=Ve();tt({baseUrl:e}),console.log("[THINKT] API App initializing..."),console.log(`[THINKT] API base URL: ${e}`),console.log(`[THINKT] Language: ${r}`);const t={container:document.getElementById("app"),projectBrowserContainer:document.getElementById("project-browser"),sessionListContainer:document.getElementById("session-list"),viewerContainer:document.getElementById("viewer-container"),resizer:document.getElementById("resizer")};for(const[i,n]of Object.entries(t))if(!n){console.error(`[THINKT] Required element not found: ${i}`);return}b=new hi({elements:t,onSessionLoaded:(i,n)=>{console.log(`[THINKT] Loaded session: ${i.id} (${n.length} entries)`),ki(i.firstPrompt??i.id??"Session")},onError:i=>{K("error",i.message)}}),xi(),yi(),fi(),console.log("[THINKT] API App initialized")}function gi(r){const e=document.getElementById("lang-select");e&&(e.value=r,e.addEventListener("change",async t=>{const i=t.target.value;Oe.includes(i)&&(await mi(i),console.log(`[THINKT] Language changed to: ${i}`),window.location.reload())}))}function fi(){const r=document.getElementById("loading");r&&(r.classList.add("hidden"),setTimeout(()=>r.remove(),300))}function ki(r){document.title=`${r} - THINKT`}function K(r,e){const t=document.getElementById("global-status");if(!t)return;t.classList.remove("connected","error","connecting"),t.classList.add(r);const i=t.querySelector(".status-text");i&&(i.textContent=e??(r==="connected"?"Connected":"Disconnected"))}function bi(r){return r instanceof HTMLElement?r.tagName==="INPUT"||r.tagName==="TEXTAREA"||r.isContentEditable:!1}function xi(){document.addEventListener("keydown",r=>{var e;if((r.ctrlKey||r.metaKey)&&r.key==="r"){r.preventDefault();const t=b==null?void 0:b.refreshProjects();t&&t.catch(i=>{});return}if((r.ctrlKey||r.metaKey)&&r.key==="k"){r.preventDefault(),vi();return}if(r.key==="Escape"){if(T!=null&&T.isOpened())return;(e=document.getElementById("app"))==null||e.focus();return}if(r.key==="/"&&!r.ctrlKey&&!r.metaKey&&!r.altKey){if(bi(r.target))return;r.preventDefault(),(b==null?void 0:b.getCurrentProject())?b==null||b.focusSessionSearch():b==null||b.focusProjectSearch()}})}function vi(){T!=null&&T.isOpened()||(T=new pi({elements:{container:document.body},onSessionSelect:(r,e)=>{wi(r,e)},onClose:()=>{T=null},onError:r=>{console.error("[THINKT] Search error:",r)}}),T.open())}async function wi(r,e){if(!r.path){console.error("[THINKT] Search result has no path");return}try{const t=b==null?void 0:b.getProjectBrowser();if(t&&r.project_name){let i=t.getProjects().find(n=>n.name===r.project_name);i||(await(b==null?void 0:b.refreshProjects()),i=t.getProjects().find(n=>n.name===r.project_name)),i!=null&&i.id&&await(b==null?void 0:b.selectProject(i.id))}if(await(b==null?void 0:b.loadSession(r.path)),b==null||b.selectSessionById(r.session_id),e!==void 0&&e>0){await new Promise(n=>setTimeout(n,100));const i=Math.max(0,e-1);b==null||b.scrollToEntry(i)}}catch(t){console.error("[THINKT] Failed to load session from search:",t)}}function yi(){Le(),W=setInterval(()=>{Le()},3e4)}async function Le(){try{const r=Ve(),e=await fetch(`${r}/api/v1/sources`,{method:"GET",headers:{Accept:"application/json"},signal:AbortSignal.timeout(5e3)});e.ok?K("connected"):K("error",`HTTP ${e.status}`)}catch(r){K("error",r instanceof Error?r.message:"Connection failed")}}function _i(){W!==null&&(clearInterval(W),W=null),b==null||b.dispose(),b=null,T==null||T.dispose(),T=null}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{Ce()}):Ce();window.addEventListener("beforeunload",_i);
