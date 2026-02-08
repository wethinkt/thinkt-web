var We=Object.defineProperty;var Ge=(s,e,t)=>e in s?We(s,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):s[e]=t;var h=(s,e,t)=>Ge(s,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const o of r)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function t(r){const o={};return r.integrity&&(o.integrity=r.integrity),r.referrerPolicy&&(o.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?o.credentials="include":r.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(r){if(r.ep)return;r.ep=!0;const o=t(r);fetch(r.href,o)}})();class fe extends Error{constructor(t,n,r){super(t);h(this,"statusCode");h(this,"response");this.statusCode=n,this.response=r,this.name="ThinktAPIError"}}class ge extends Error{constructor(t,n){super(t);h(this,"originalError");this.originalError=n,this.name="ThinktNetworkError"}}const Qe={baseUrl:"http://localhost:7433",apiVersion:"/api/v1",timeout:3e4};function P(s,e,t,n){let r=`${s}${e}${t}`;if(n&&Object.keys(n).length>0){const o=new URLSearchParams;for(const[i,c]of Object.entries(n))c!=null&&o.append(i,String(c));const a=o.toString();a&&(r+=`?${a}`)}return r}class Ve{constructor(e){h(this,"config");this.config={...Qe,...e}}setConfig(e){this.config={...this.config,...e}}getConfig(){return{...this.config}}async fetchWithTimeout(e,t={}){const n=new AbortController,r=setTimeout(()=>n.abort(),this.config.timeout),o=this.config.fetch??fetch;try{const a=await o(e,{...t,signal:n.signal,headers:{Accept:"application/json",...t.headers}});if(clearTimeout(r),!a.ok){let i;try{i=await a.json()}catch{}throw new fe((i==null?void 0:i.message)||`HTTP ${a.status}: ${a.statusText}`,a.status,i)}return await a.json()}catch(a){throw clearTimeout(r),a instanceof fe?a:a instanceof Error&&a.name==="AbortError"?new ge(`Request timeout after ${this.config.timeout}ms`,a):new ge(a instanceof Error?a.message:"Network error",a)}}async getSources(){const e=P(this.config.baseUrl,this.config.apiVersion,"/sources");return(await this.fetchWithTimeout(e)).sources??[]}async getProjects(e){const t=P(this.config.baseUrl,this.config.apiVersion,"/projects",{source:e});return(await this.fetchWithTimeout(t)).projects??[]}async getSessions(e){const t=encodeURIComponent(e),n=P(this.config.baseUrl,this.config.apiVersion,`/projects/${t}/sessions`);return(await this.fetchWithTimeout(n)).sessions??[]}async getSession(e,t){const n=encodeURIComponent(e),r=P(this.config.baseUrl,this.config.apiVersion,`/sessions/${n}`,{limit:t==null?void 0:t.limit,offset:t==null?void 0:t.offset}),o=await this.fetchWithTimeout(r);return{meta:o.meta,entries:o.entries??[],total:o.total??0,has_more:o.has_more??!1}}async openIn(e,t){const n=P(this.config.baseUrl,this.config.apiVersion,"/open-in"),r=await this.fetchWithTimeout(n,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({app:e,path:t})});if(r.error)throw new Error(r.error)}async getOpenInApps(){const e=P(this.config.baseUrl,this.config.apiVersion,"/open-in/apps");return(await this.fetchWithTimeout(e)).apps??[]}async*streamSessionEntries(e,t=100){let n=0,r=!0;for(;r;){const o=await this.getSession(e,{limit:t,offset:n});for(const a of o.entries)yield a;if(r=o.has_more,n+=o.entries.length,o.entries.length===0)break}}async getAllSessionEntries(e,t=100){const n=[];for await(const r of this.streamSessionEntries(e,t))n.push(r);return n}}function ne(s){return s==="kimi"?"kimi":s==="gemini"?"gemini":"claude"}function Xe(s){switch(s){case"user":return"user";case"assistant":return"assistant";case"tool":return"tool";case"system":return"system";case"summary":return"summary";case"progress":return"progress";case"checkpoint":return"checkpoint";default:return"assistant"}}function Ye(s){switch(s.type??"text"){case"text":return{type:"text",text:s.text??""};case"thinking":return{type:"thinking",thinking:s.thinking??"",signature:s.signature};case"tool_use":return{type:"tool_use",toolUseId:s.tool_use_id??"",toolName:s.tool_name??"unknown",toolInput:s.tool_input??{}};case"tool_result":return{type:"tool_result",toolUseId:s.tool_use_id??"",toolResult:s.tool_result??"",isError:s.is_error??!1};case"image":return{type:"image",mediaType:s.media_type??"image/png",mediaData:s.media_data??""};case"document":return{type:"document",mediaType:s.media_type??"application/pdf",mediaData:s.media_data??"",filename:void 0};default:return{type:"text",text:s.text??""}}}function Je(s){return{id:s.id??"",name:s.name??"",path:s.path??"",displayPath:s.display_path,sessionCount:s.session_count??0,lastModified:s.last_modified?new Date(s.last_modified):void 0,source:ne(s.source),workspaceId:s.workspace_id,sourceBasePath:s.source_base_path,pathExists:s.path_exists??!0}}function ke(s){return{id:s.id??"unknown",projectPath:s.project_path,fullPath:s.full_path,firstPrompt:s.first_prompt,summary:s.summary,entryCount:s.entry_count??0,fileSize:s.file_size,createdAt:s.created_at?new Date(s.created_at):void 0,modifiedAt:s.modified_at?new Date(s.modified_at):void 0,gitBranch:s.git_branch,model:s.model,source:ne(s.source),workspaceId:s.workspace_id,chunkCount:s.chunk_count,title:s.first_prompt?s.first_prompt.slice(0,60)+(s.first_prompt.length>60?"...":""):s.id??"Untitled Session"}}function me(s){var n;const e=((n=s.content_blocks)==null?void 0:n.map(Ye))??[],t={};return s.metadata&&Object.assign(t,s.metadata),s.workspace_id&&(t.workspaceId=s.workspace_id),{uuid:s.uuid??`entry-${Date.now()}-${Math.random().toString(36).slice(2)}`,parentUuid:s.parent_uuid??void 0,role:Xe(s.role),timestamp:s.timestamp?new Date(s.timestamp):new Date,source:ne(s.source),contentBlocks:e,text:s.text??e.filter(r=>r.type==="text").map(r=>r.text).join(`
`),model:s.model,usage:s.usage?{inputTokens:s.usage.input_tokens??0,outputTokens:s.usage.output_tokens??0,cacheCreationInputTokens:s.usage.cache_creation_input_tokens,cacheReadInputTokens:s.usage.cache_read_input_tokens}:void 0,gitBranch:s.git_branch,cwd:s.cwd,isCheckpoint:s.is_checkpoint??!1,isSidechain:s.is_sidechain??!1,agentId:s.agent_id,sourceAgentId:s.source_agent_id,metadata:Object.keys(t).length>0?t:void 0}}class Le{constructor(e){h(this,"_api");this._api=new Ve(e)}get api(){return this._api}setConfig(e){this._api.setConfig(e)}getConfig(){return this._api.getConfig()}async getSources(){return this._api.getSources()}async getProjects(e){return(await this._api.getProjects(e)).map(Je)}async getSessions(e){return(await this._api.getSessions(e)).map(ke)}async getSession(e,t){const n=await this._api.getSession(e,t);return{meta:ke(n.meta),entries:n.entries.map(me),total:n.total,hasMore:n.has_more}}async openIn(e,t){return this._api.openIn(e,t)}async getOpenInApps(){return this._api.getOpenInApps()}async*streamSessionEntries(e,t){for await(const n of this._api.streamSessionEntries(e,t))yield me(n)}async getAllSessionEntries(e,t){const n=[];for await(const r of this.streamSessionEntries(e,t))n.push(r);return n}}let j=null;function se(){return j||(j=new Le),j}function et(s){j?j.setConfig(s):j=new Le(s)}const tt=`
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
`;class nt{constructor(e){h(this,"elements");h(this,"options");h(this,"client");h(this,"projects",[]);h(this,"filteredProjects",[]);h(this,"selectedIndex",-1);h(this,"isLoading",!1);h(this,"itemElements",new Map);h(this,"boundHandlers",[]);h(this,"disposed",!1);h(this,"stylesInjected",!1);this.elements=e.elements,this.options={...e,enableSearch:e.enableSearch??!0,classPrefix:e.classPrefix??"thinkt-project-browser"},this.client=e.client??se(),this.init(),this.loadProjects()}init(){this.injectStyles(),this.createStructure(),this.attachListeners()}injectStyles(){if(this.stylesInjected)return;const e="thinkt-project-browser-styles";if(!document.getElementById(e)){const t=document.createElement("style");t.id=e,t.textContent=tt,document.head.appendChild(t)}this.stylesInjected=!0}createStructure(){const{container:e}=this.elements,{classPrefix:t}=this.options;e.className=t;const n=document.createElement("div");n.className=`${t}__header`;const r=document.createElement("div");if(r.className=`${t}__toolbar`,this.options.enableSearch){const l=this.elements.searchInput??document.createElement("input");l.className=`${t}__search`,l.type="text",l.placeholder="Search projects...",this.elements.searchInput||(this.elements.searchInput=l,r.appendChild(l))}const o=this.elements.sourceFilter??document.createElement("select");o.className=`${t}__filter`,o.innerHTML=`
      <option value="">All Sources</option>
      <option value="claude">Claude</option>
      <option value="kimi">Kimi</option>
      <option value="gemini">Gemini</option>
    `,this.elements.sourceFilter||(this.elements.sourceFilter=o,r.appendChild(o)),n.appendChild(r);const a=document.createElement("div");a.className=`${t}__stats`,a.textContent="Loading...",n.appendChild(a),e.appendChild(n);const i=document.createElement("div");i.className=`${t}__content`;const c=document.createElement("ul");c.className=`${t}__list`,c.setAttribute("role","listbox"),i.appendChild(c),this.elements.loadingIndicator||(this.elements.loadingIndicator=document.createElement("div"),this.elements.loadingIndicator.className=`${t}__loading`,this.elements.loadingIndicator.textContent="Loading projects..."),i.appendChild(this.elements.loadingIndicator),this.elements.errorDisplay||(this.elements.errorDisplay=document.createElement("div"),this.elements.errorDisplay.className=`${t}__error`,this.elements.errorDisplay.style.display="none"),i.appendChild(this.elements.errorDisplay),e.appendChild(i)}attachListeners(){const{searchInput:e,sourceFilter:t,container:n}=this.elements;if(e){const o=()=>this.filterProjects();e.addEventListener("input",o),this.boundHandlers.push(()=>e.removeEventListener("input",o))}if(t){const o=()=>{this.loadProjects(t.value||void 0)};t.addEventListener("change",o),this.boundHandlers.push(()=>t.removeEventListener("change",o))}const r=o=>this.handleKeydown(o);n.addEventListener("keydown",r),this.boundHandlers.push(()=>n.removeEventListener("keydown",r)),n.setAttribute("tabindex","0")}handleKeydown(e){if(this.filteredProjects.length!==0)switch(e.key){case"ArrowDown":e.preventDefault(),this.selectIndex(Math.min(this.selectedIndex+1,this.filteredProjects.length-1));break;case"ArrowUp":e.preventDefault(),this.selectIndex(Math.max(this.selectedIndex-1,0));break;case"Enter":this.selectedIndex>=0&&this.selectProject(this.filteredProjects[this.selectedIndex]);break;case"Home":e.preventDefault(),this.selectIndex(0);break;case"End":e.preventDefault(),this.selectIndex(this.filteredProjects.length-1);break}}async loadProjects(e){var t,n,r,o;if(!this.isLoading){this.isLoading=!0,this.showLoading(!0),this.showError(null);try{this.projects=await this.client.getProjects(e),this.filteredProjects=[...this.projects],this.render(),Promise.resolve((n=(t=this.options).onProjectsLoaded)==null?void 0:n.call(t,this.projects))}catch(a){const i=a instanceof Error?a:new Error(String(a));this.showError(i),(o=(r=this.options).onError)==null||o.call(r,i)}finally{this.isLoading=!1,this.showLoading(!1)}}}showLoading(e){this.elements.loadingIndicator&&(this.elements.loadingIndicator.style.display=e?"flex":"none");const t=this.elements.container.querySelector(`.${this.options.classPrefix}__list`);t&&(t.style.display=e?"none":"block")}showError(e){if(this.elements.errorDisplay)if(e){this.elements.errorDisplay.innerHTML="";const t=document.createElement("div");t.textContent=e.message,this.elements.errorDisplay.appendChild(t);const n=document.createElement("button");n.className=`${this.options.classPrefix}__retry`,n.textContent="Retry",n.addEventListener("click",()=>{var r;this.loadProjects(((r=this.elements.sourceFilter)==null?void 0:r.value)||void 0)}),this.elements.errorDisplay.appendChild(n),this.elements.errorDisplay.style.display="block"}else this.elements.errorDisplay.style.display="none"}filterProjects(){var t;const e=((t=this.elements.searchInput)==null?void 0:t.value.toLowerCase())??"";this.filteredProjects=this.projects.filter(n=>{var o,a;return!e||((o=n.name)==null?void 0:o.toLowerCase().includes(e))||((a=n.path)==null?void 0:a.toLowerCase().includes(e))}),this.selectedIndex=-1,this.render()}render(){this.updateStats(),this.renderList()}updateStats(){const e=this.elements.container.querySelector(`.${this.options.classPrefix}__stats`);if(e){const t=this.projects.length,n=this.filteredProjects.length;n===t?e.textContent=`${t} project${t!==1?"s":""}`:e.textContent=`Showing ${n} of ${t} projects`}}renderList(){var n;const e=this.elements.container.querySelector("ul");if(!e)return;if(e.innerHTML="",this.itemElements.clear(),this.elements.container.querySelectorAll(`.${this.options.classPrefix}__empty`).forEach(r=>r.remove()),this.filteredProjects.length===0){const r=document.createElement("div");r.className=`${this.options.classPrefix}__empty`,r.textContent=this.projects.length===0?"No projects found":"No projects match your search",(n=e.parentElement)==null||n.appendChild(r);return}for(let r=0;r<this.filteredProjects.length;r++){const o=this.filteredProjects[r],a=this.renderProjectItem(o,r);e.appendChild(a),this.itemElements.set(this.projectKey(o,r),a)}}renderProjectItem(e,t){if(this.options.projectRenderer)return this.options.projectRenderer(e,t);const{classPrefix:n}=this.options,r=document.createElement("li");r.className=`${n}__item`,r.setAttribute("role","option"),r.setAttribute("aria-selected","false"),r.dataset.index=String(t),r.dataset.projectId=e.id;const o=e.source??"claude",a=`${n}__icon--${o}`;let i="🅲";return o==="kimi"&&(i="🅺"),o==="gemini"&&(i="🅶"),r.innerHTML=`
      <div class="${n}__icon ${a}">${i}</div>
      <div class="${n}__info">
        <div class="${n}__name">${this.escapeHtml(e.name??"Unknown")}</div>
        <div class="${n}__path">${this.escapeHtml(e.displayPath??e.path??"")}</div>
      </div>
      <div class="${n}__meta">
        <span class="${n}__count">${e.sessionCount??0}</span>
        <span>session${(e.sessionCount??0)!==1?"s":""}</span>
      </div>
    `,r.addEventListener("click",()=>{this.selectIndex(t),this.selectProject(e)}),r}escapeHtml(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}projectKey(e,t){return e.id??`project-${t}`}selectIndex(e){if(this.selectedIndex>=0){const t=this.filteredProjects[this.selectedIndex],n=t?this.itemElements.get(this.projectKey(t,this.selectedIndex)):void 0;n&&(n.classList.remove(`${this.options.classPrefix}__item--selected`),n.setAttribute("aria-selected","false"))}if(this.selectedIndex=e,e>=0){const t=this.filteredProjects[e],n=t?this.itemElements.get(this.projectKey(t,e)):void 0;n&&(n.classList.add(`${this.options.classPrefix}__item--selected`),n.setAttribute("aria-selected","true"),n.scrollIntoView({block:"nearest",behavior:"smooth"}))}}selectProject(e){var t,n;(n=(t=this.options).onProjectSelect)==null||n.call(t,e)}getProjects(){return[...this.projects]}getFilteredProjects(){return[...this.filteredProjects]}getSelectedProject(){return this.selectedIndex>=0?this.filteredProjects[this.selectedIndex]??null:null}selectProjectById(e){const t=this.filteredProjects.findIndex(n=>n.id===e);t>=0&&this.selectIndex(t)}refresh(){var e;this.loadProjects(((e=this.elements.sourceFilter)==null?void 0:e.value)||void 0)}setSearch(e){this.elements.searchInput&&(this.elements.searchInput.value=e,this.filterProjects())}setSourceFilter(e){this.elements.sourceFilter&&(this.elements.sourceFilter.value=e??"",this.loadProjects(e??void 0))}focusSearch(){var e;(e=this.elements.searchInput)==null||e.focus()}dispose(){if(this.disposed)return;this.boundHandlers.forEach(t=>t()),this.boundHandlers=[],this.itemElements.clear(),this.projects=[],this.filteredProjects=[];const e=this.elements.container.querySelector(`.${this.options.classPrefix}__content`);e&&(e.innerHTML=""),this.disposed=!0}}const st=`
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
`;function rt(s){if(!s)return"Unknown";try{const e=s instanceof Date?s:new Date(s),n=new Date().getTime()-e.getTime(),r=Math.floor(n/1e3),o=Math.floor(r/60),a=Math.floor(o/60),i=Math.floor(a/24),c=Math.floor(i/7),l=Math.floor(i/30),p=Math.floor(i/365);return r<60?"just now":o<60?`${o}m ago`:a<24?`${a}h ago`:i<7?`${i}d ago`:c<4?`${c}w ago`:l<12?`${l}mo ago`:`${p}y ago`}catch{return"Invalid"}}function ot(s){return s==null?"0":s>=1e6?(s/1e6).toFixed(1)+"M":s>=1e3?(s/1e3).toFixed(1)+"k":s.toString()}class it{constructor(e){h(this,"elements");h(this,"options");h(this,"client");h(this,"sessions",[]);h(this,"filteredSessions",[]);h(this,"selectedIndex",-1);h(this,"isLoading",!1);h(this,"itemElements",new Map);h(this,"boundHandlers",[]);h(this,"disposed",!1);h(this,"stylesInjected",!1);this.elements=e.elements,this.options={...e,enableSearch:e.enableSearch??!0,classPrefix:e.classPrefix??"thinkt-session-list",dateLocale:e.dateLocale??"en-US",showEntryCount:e.showEntryCount??!0,showFileSize:e.showFileSize??!0,showModel:e.showModel??!0},this.client=e.client??se(),this.init()}async init(){this.injectStyles(),this.createStructure(),this.attachListeners(),this.options.projectId&&await this.loadSessions(this.options.projectId)}injectStyles(){if(this.stylesInjected)return;const e="thinkt-session-list-styles";if(!document.getElementById(e)){const t=document.createElement("style");t.id=e,t.textContent=st,document.head.appendChild(t)}this.stylesInjected=!0}createStructure(){const{container:e}=this.elements,{classPrefix:t}=this.options;e.className=t,e.innerHTML="";const n=document.createElement("div");if(n.className=`${t}__header`,this.options.enableSearch){const i=this.elements.searchInput??document.createElement("input");i.className=`${t}__search`,i.type="text",i.placeholder="Search sessions...",this.elements.searchInput||(this.elements.searchInput=i),n.appendChild(i)}const r=document.createElement("div");r.className=`${t}__stats`,r.textContent=this.options.projectId?"Loading...":"Select a project",n.appendChild(r),e.appendChild(n);const o=document.createElement("div");o.className=`${t}__content`;const a=document.createElement("ul");a.className=`${t}__list`,a.setAttribute("role","listbox"),o.appendChild(a),this.elements.loadingIndicator||(this.elements.loadingIndicator=document.createElement("div"),this.elements.loadingIndicator.className=`${t}__loading`,this.elements.loadingIndicator.textContent="Loading sessions..."),o.appendChild(this.elements.loadingIndicator),this.elements.errorDisplay||(this.elements.errorDisplay=document.createElement("div"),this.elements.errorDisplay.className=`${t}__error`,this.elements.errorDisplay.style.display="none"),o.appendChild(this.elements.errorDisplay),e.appendChild(o)}attachListeners(){const{searchInput:e,container:t}=this.elements;if(e){const r=()=>this.filterSessions();e.addEventListener("input",r),this.boundHandlers.push(()=>e.removeEventListener("input",r))}const n=r=>this.handleKeydown(r);t.addEventListener("keydown",n),this.boundHandlers.push(()=>t.removeEventListener("keydown",n)),t.setAttribute("tabindex","0")}handleKeydown(e){if(this.filteredSessions.length!==0)switch(e.key){case"ArrowDown":e.preventDefault(),this.selectIndex(Math.min(this.selectedIndex+1,this.filteredSessions.length-1));break;case"ArrowUp":e.preventDefault(),this.selectIndex(Math.max(this.selectedIndex-1,0));break;case"Enter":this.selectedIndex>=0&&this.selectSession(this.filteredSessions[this.selectedIndex]);break;case"Home":e.preventDefault(),this.selectIndex(0);break;case"End":e.preventDefault(),this.selectIndex(this.filteredSessions.length-1);break}}async loadSessions(e){var t,n,r,o;if(!this.isLoading){this.options.projectId=e,this.isLoading=!0,this.showLoading(!0),this.showError(null),this.sessions=[],this.filteredSessions=[],this.selectedIndex=-1,this.render();try{this.sessions=await this.client.getSessions(e),this.sessions.sort((a,i)=>{var p,g;const c=((p=a.modifiedAt)==null?void 0:p.getTime())??0;return(((g=i.modifiedAt)==null?void 0:g.getTime())??0)-c}),this.filteredSessions=[...this.sessions],this.render(),Promise.resolve((n=(t=this.options).onSessionsLoaded)==null?void 0:n.call(t,this.sessions))}catch(a){const i=a instanceof Error?a:new Error(String(a));this.showError(i),(o=(r=this.options).onError)==null||o.call(r,i)}finally{this.isLoading=!1,this.showLoading(!1)}}}showLoading(e){this.elements.loadingIndicator&&(this.elements.loadingIndicator.style.display=e?"flex":"none");const t=this.elements.container.querySelector(`.${this.options.classPrefix}__list`);t&&(t.style.display=e?"none":"block")}showError(e){if(this.elements.errorDisplay)if(e){this.elements.errorDisplay.innerHTML="";const t=document.createElement("div");if(t.textContent=e.message,this.elements.errorDisplay.appendChild(t),this.options.projectId){const n=document.createElement("button");n.className=`${this.options.classPrefix}__retry`,n.textContent="Retry",n.addEventListener("click",()=>{this.options.projectId&&this.loadSessions(this.options.projectId)}),this.elements.errorDisplay.appendChild(n)}this.elements.errorDisplay.style.display="block"}else this.elements.errorDisplay.style.display="none"}filterSessions(){var t;const e=((t=this.elements.searchInput)==null?void 0:t.value.toLowerCase())??"";this.filteredSessions=this.sessions.filter(n=>e?[n.id,n.summary,n.firstPrompt,n.model,n.gitBranch].some(o=>o==null?void 0:o.toLowerCase().includes(e)):!0),this.selectedIndex=-1,this.render()}render(){this.updateStats(),this.renderList()}updateStats(){const e=this.elements.container.querySelector(`.${this.options.classPrefix}__stats`);if(e)if(!this.options.projectId)e.textContent="Select a project to view sessions";else if(this.isLoading)e.textContent="Loading sessions...";else{const t=this.sessions.length,n=this.filteredSessions.length;n===t?e.textContent=`${t} session${t!==1?"s":""}`:e.textContent=`Showing ${n} of ${t} sessions`}}renderList(){var n,r;const e=this.elements.container.querySelector("ul");if(!e)return;if(e.innerHTML="",this.itemElements.clear(),this.elements.container.querySelectorAll(`.${this.options.classPrefix}__empty`).forEach(o=>o.remove()),!this.options.projectId){const o=document.createElement("div");o.className=`${this.options.classPrefix}__empty`,o.textContent="Select a project to view its sessions",(n=e.parentElement)==null||n.appendChild(o);return}if(this.filteredSessions.length===0){const o=document.createElement("div");o.className=`${this.options.classPrefix}__empty`,o.textContent=this.sessions.length===0?"No sessions found for this project":"No sessions match your search",(r=e.parentElement)==null||r.appendChild(o);return}for(let o=0;o<this.filteredSessions.length;o++){const a=this.filteredSessions[o],i=this.renderSessionItem(a,o);e.appendChild(i),this.itemElements.set(this.sessionKey(a,o),i)}}renderSessionItem(e,t){if(this.options.sessionRenderer)return this.options.sessionRenderer(e,t);const{classPrefix:n,showEntryCount:r,showModel:o}=this.options,a=document.createElement("li");a.className=`${n}__item`,a.setAttribute("role","option"),a.setAttribute("aria-selected","false"),a.dataset.index=String(t),a.dataset.sessionId=e.id;const i=e.source??"claude",c=(e.chunkCount??0)>1,l=e.firstPrompt?e.firstPrompt.slice(0,80)+(e.firstPrompt.length>80?"...":""):e.id??"Unknown Session",p=[];if(p.push(`<span class="${n}__meta-item">${rt(e.modifiedAt)}</span>`),r&&e.entryCount!==void 0&&p.push(`<span class="${n}__meta-item">${ot(e.entryCount)} msgs</span>`),o&&e.model){const g=e.model.replace(/^(claude-|gpt-|gemini-)/,"");p.push(`<span class="${n}__meta-item">${g}</span>`)}return i!=="claude"&&p.push(`<span class="${n}__badge ${n}__badge--${i}">${i}</span>`),c&&p.push(`<span class="${n}__badge ${n}__badge--chunked">chunked</span>`),a.innerHTML=`
      <div class="${n}__title">${this.escapeHtml(l)}</div>
      ${e.summary?`<div class="${n}__summary">${this.escapeHtml(e.summary)}</div>`:""}
      <div class="${n}__meta">${p.join("")}</div>
    `,a.addEventListener("click",()=>{this.selectIndex(t),this.selectSession(e)}),a}escapeHtml(e){const t=document.createElement("div");return t.textContent=e,t.innerHTML}sessionKey(e,t){return e.id??`session-${t}`}selectIndex(e){if(this.selectedIndex>=0){const t=this.filteredSessions[this.selectedIndex],n=t?this.itemElements.get(this.sessionKey(t,this.selectedIndex)):void 0;n&&(n.classList.remove(`${this.options.classPrefix}__item--selected`),n.setAttribute("aria-selected","false"))}if(this.selectedIndex=e,e>=0){const t=this.filteredSessions[e],n=t?this.itemElements.get(this.sessionKey(t,e)):void 0;n&&(n.classList.add(`${this.options.classPrefix}__item--selected`),n.setAttribute("aria-selected","true"),n.scrollIntoView({block:"nearest",behavior:"smooth"}))}}selectSession(e){const t=this.options.onSessionSelect;if(t)try{t(e)}catch(n){console.error("Session selection handler error:",n)}}getSessions(){return[...this.sessions]}getFilteredSessions(){return[...this.filteredSessions]}getSelectedSession(){return this.selectedIndex>=0?this.filteredSessions[this.selectedIndex]??null:null}selectSessionById(e){const t=this.filteredSessions.findIndex(n=>n.id===e);t>=0&&this.selectIndex(t)}refresh(){return this.options.projectId?this.loadSessions(this.options.projectId):Promise.resolve()}setSearch(e){this.elements.searchInput&&(this.elements.searchInput.value=e,this.filterSessions())}setProjectId(e){return this.loadSessions(e)}focusSearch(){var e;(e=this.elements.searchInput)==null||e.focus()}dispose(){this.disposed||(this.boundHandlers.forEach(e=>e()),this.boundHandlers=[],this.itemElements.clear(),this.sessions=[],this.filteredSessions=[],this.elements.container.innerHTML="",this.disposed=!0)}}const at=`
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
`;function re(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}var I=re();function Pe(s){I=s}var N={exec:()=>null};function m(s,e=""){let t=typeof s=="string"?s:s.source,n={replace:(r,o)=>{let a=typeof o=="string"?o:o.source;return a=a.replace(_.caret,"$1"),t=t.replace(r,a),n},getRegex:()=>new RegExp(t,e)};return n}var lt=(()=>{try{return!!new RegExp("(?<=1)(?<!1)")}catch{return!1}})(),_={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceTabs:/^\t+/,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] +\S/,listReplaceTask:/^\[[ xX]\] +/,listTaskCheckbox:/\[[ xX]\]/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,unescapeTest:/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:s=>new RegExp(`^( {0,3}${s})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:s=>new RegExp(`^ {0,${Math.min(3,s-1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),hrRegex:s=>new RegExp(`^ {0,${Math.min(3,s-1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),fencesBeginRegex:s=>new RegExp(`^ {0,${Math.min(3,s-1)}}(?:\`\`\`|~~~)`),headingBeginRegex:s=>new RegExp(`^ {0,${Math.min(3,s-1)}}#`),htmlBeginRegex:s=>new RegExp(`^ {0,${Math.min(3,s-1)}}<(?:[a-z].*>|!--)`,"i")},ct=/^(?:[ \t]*(?:\n|$))+/,ht=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,dt=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,D=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,pt=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,oe=/(?:[*+-]|\d{1,9}[.)])/,Re=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,je=m(Re).replace(/bull/g,oe).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),ut=m(Re).replace(/bull/g,oe).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),ie=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,ft=/^[^\n]+/,ae=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/,gt=m(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",ae).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),kt=m(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g,oe).getRegex(),Q="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",le=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,mt=m("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",le).replace("tag",Q).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),ze=m(ie).replace("hr",D).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",Q).getRegex(),bt=m(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",ze).getRegex(),ce={blockquote:bt,code:ht,def:gt,fences:dt,heading:pt,hr:D,html:mt,lheading:je,list:kt,newline:ct,paragraph:ze,table:N,text:ft},be=m("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",D).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",Q).getRegex(),xt={...ce,lheading:ut,table:be,paragraph:m(ie).replace("hr",D).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",be).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",Q).getRegex()},wt={...ce,html:m(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment",le).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:N,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:m(ie).replace("hr",D).replace("heading",` *#{1,6} *[^
]`).replace("lheading",je).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},vt=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,_t=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,Ae=/^( {2,}|\\)\n(?!\s*$)/,yt=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,V=/[\p{P}\p{S}]/u,he=/[\s\p{P}\p{S}]/u,Be=/[^\s\p{P}\p{S}]/u,St=m(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,he).getRegex(),Me=/(?!~)[\p{P}\p{S}]/u,$t=/(?!~)[\s\p{P}\p{S}]/u,Et=/(?:[^\s\p{P}\p{S}]|~)/u,Tt=m(/link|precode-code|html/,"g").replace("link",/\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-",lt?"(?<!`)()":"(^^|[^`])").replace("code",/(?<b>`+)[^`]+\k<b>(?!`)/).replace("html",/<(?! )[^<>]*?>/).getRegex(),He=/^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/,It=m(He,"u").replace(/punct/g,V).getRegex(),Ct=m(He,"u").replace(/punct/g,Me).getRegex(),Ne="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",Lt=m(Ne,"gu").replace(/notPunctSpace/g,Be).replace(/punctSpace/g,he).replace(/punct/g,V).getRegex(),Pt=m(Ne,"gu").replace(/notPunctSpace/g,Et).replace(/punctSpace/g,$t).replace(/punct/g,Me).getRegex(),Rt=m("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,Be).replace(/punctSpace/g,he).replace(/punct/g,V).getRegex(),jt=m(/\\(punct)/,"gu").replace(/punct/g,V).getRegex(),zt=m(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),At=m(le).replace("(?:-->|$)","-->").getRegex(),Bt=m("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",At).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),Z=/(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+[^`]*?`+(?!`)|[^\[\]\\`])*?/,Mt=m(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label",Z).replace("href",/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),De=m(/^!?\[(label)\]\[(ref)\]/).replace("label",Z).replace("ref",ae).getRegex(),Ue=m(/^!?\[(ref)\](?:\[\])?/).replace("ref",ae).getRegex(),Ht=m("reflink|nolink(?!\\()","g").replace("reflink",De).replace("nolink",Ue).getRegex(),xe=/[hH][tT][tT][pP][sS]?|[fF][tT][pP]/,de={_backpedal:N,anyPunctuation:jt,autolink:zt,blockSkip:Tt,br:Ae,code:_t,del:N,emStrongLDelim:It,emStrongRDelimAst:Lt,emStrongRDelimUnd:Rt,escape:vt,link:Mt,nolink:Ue,punctuation:St,reflink:De,reflinkSearch:Ht,tag:Bt,text:yt,url:N},Nt={...de,link:m(/^!?\[(label)\]\((.*?)\)/).replace("label",Z).getRegex(),reflink:m(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",Z).getRegex()},Y={...de,emStrongRDelimAst:Pt,emStrongLDelim:Ct,url:m(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol",xe).replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,text:m(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol",xe).getRegex()},Dt={...Y,br:m(Ae).replace("{2,}","*").getRegex(),text:m(Y.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},F={normal:ce,gfm:xt,pedantic:wt},B={normal:de,gfm:Y,breaks:Dt,pedantic:Nt},Ut={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},we=s=>Ut[s];function E(s,e){if(e){if(_.escapeTest.test(s))return s.replace(_.escapeReplace,we)}else if(_.escapeTestNoEncode.test(s))return s.replace(_.escapeReplaceNoEncode,we);return s}function ve(s){try{s=encodeURI(s).replace(_.percentDecode,"%")}catch{return null}return s}function _e(s,e){var o;let t=s.replace(_.findPipe,(a,i,c)=>{let l=!1,p=i;for(;--p>=0&&c[p]==="\\";)l=!l;return l?"|":" |"}),n=t.split(_.splitPipe),r=0;if(n[0].trim()||n.shift(),n.length>0&&!((o=n.at(-1))!=null&&o.trim())&&n.pop(),e)if(n.length>e)n.splice(e);else for(;n.length<e;)n.push("");for(;r<n.length;r++)n[r]=n[r].trim().replace(_.slashPipe,"|");return n}function M(s,e,t){let n=s.length;if(n===0)return"";let r=0;for(;r<n&&s.charAt(n-r-1)===e;)r++;return s.slice(0,n-r)}function Ft(s,e){if(s.indexOf(e[1])===-1)return-1;let t=0;for(let n=0;n<s.length;n++)if(s[n]==="\\")n++;else if(s[n]===e[0])t++;else if(s[n]===e[1]&&(t--,t<0))return n;return t>0?-2:-1}function ye(s,e,t,n,r){let o=e.href,a=e.title||null,i=s[1].replace(r.other.outputLinkReplace,"$1");n.state.inLink=!0;let c={type:s[0].charAt(0)==="!"?"image":"link",raw:t,href:o,title:a,text:i,tokens:n.inlineTokens(i)};return n.state.inLink=!1,c}function qt(s,e,t){let n=s.match(t.other.indentCodeCompensation);if(n===null)return e;let r=n[1];return e.split(`
`).map(o=>{let a=o.match(t.other.beginningSpace);if(a===null)return o;let[i]=a;return i.length>=r.length?o.slice(r.length):o}).join(`
`)}var W=class{constructor(s){h(this,"options");h(this,"rules");h(this,"lexer");this.options=s||I}space(s){let e=this.rules.block.newline.exec(s);if(e&&e[0].length>0)return{type:"space",raw:e[0]}}code(s){let e=this.rules.block.code.exec(s);if(e){let t=e[0].replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:e[0],codeBlockStyle:"indented",text:this.options.pedantic?t:M(t,`
`)}}}fences(s){let e=this.rules.block.fences.exec(s);if(e){let t=e[0],n=qt(t,e[3]||"",this.rules);return{type:"code",raw:t,lang:e[2]?e[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):e[2],text:n}}}heading(s){let e=this.rules.block.heading.exec(s);if(e){let t=e[2].trim();if(this.rules.other.endingHash.test(t)){let n=M(t,"#");(this.options.pedantic||!n||this.rules.other.endingSpaceChar.test(n))&&(t=n.trim())}return{type:"heading",raw:e[0],depth:e[1].length,text:t,tokens:this.lexer.inline(t)}}}hr(s){let e=this.rules.block.hr.exec(s);if(e)return{type:"hr",raw:M(e[0],`
`)}}blockquote(s){let e=this.rules.block.blockquote.exec(s);if(e){let t=M(e[0],`
`).split(`
`),n="",r="",o=[];for(;t.length>0;){let a=!1,i=[],c;for(c=0;c<t.length;c++)if(this.rules.other.blockquoteStart.test(t[c]))i.push(t[c]),a=!0;else if(!a)i.push(t[c]);else break;t=t.slice(c);let l=i.join(`
`),p=l.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");n=n?`${n}
${l}`:l,r=r?`${r}
${p}`:p;let g=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(p,o,!0),this.lexer.state.top=g,t.length===0)break;let f=o.at(-1);if((f==null?void 0:f.type)==="code")break;if((f==null?void 0:f.type)==="blockquote"){let d=f,k=d.raw+`
`+t.join(`
`),u=this.blockquote(k);o[o.length-1]=u,n=n.substring(0,n.length-d.raw.length)+u.raw,r=r.substring(0,r.length-d.text.length)+u.text;break}else if((f==null?void 0:f.type)==="list"){let d=f,k=d.raw+`
`+t.join(`
`),u=this.list(k);o[o.length-1]=u,n=n.substring(0,n.length-f.raw.length)+u.raw,r=r.substring(0,r.length-d.raw.length)+u.raw,t=k.substring(o.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:n,tokens:o,text:r}}}list(s){var t,n;let e=this.rules.block.list.exec(s);if(e){let r=e[1].trim(),o=r.length>1,a={type:"list",raw:"",ordered:o,start:o?+r.slice(0,-1):"",loose:!1,items:[]};r=o?`\\d{1,9}\\${r.slice(-1)}`:`\\${r}`,this.options.pedantic&&(r=o?r:"[*+-]");let i=this.rules.other.listItemRegex(r),c=!1;for(;s;){let p=!1,g="",f="";if(!(e=i.exec(s))||this.rules.block.hr.test(s))break;g=e[0],s=s.substring(g.length);let d=e[2].split(`
`,1)[0].replace(this.rules.other.listReplaceTabs,y=>" ".repeat(3*y.length)),k=s.split(`
`,1)[0],u=!d.trim(),b=0;if(this.options.pedantic?(b=2,f=d.trimStart()):u?b=e[1].length+1:(b=e[2].search(this.rules.other.nonSpaceChar),b=b>4?1:b,f=d.slice(b),b+=e[1].length),u&&this.rules.other.blankLine.test(k)&&(g+=k+`
`,s=s.substring(k.length+1),p=!0),!p){let y=this.rules.other.nextBulletRegex(b),C=this.rules.other.hrRegex(b),L=this.rules.other.fencesBeginRegex(b),U=this.rules.other.headingBeginRegex(b),Ze=this.rules.other.htmlBeginRegex(b);for(;s;){let X=s.split(`
`,1)[0],A;if(k=X,this.options.pedantic?(k=k.replace(this.rules.other.listReplaceNesting,"  "),A=k):A=k.replace(this.rules.other.tabCharGlobal,"    "),L.test(k)||U.test(k)||Ze.test(k)||y.test(k)||C.test(k))break;if(A.search(this.rules.other.nonSpaceChar)>=b||!k.trim())f+=`
`+A.slice(b);else{if(u||d.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||L.test(d)||U.test(d)||C.test(d))break;f+=`
`+k}!u&&!k.trim()&&(u=!0),g+=X+`
`,s=s.substring(X.length+1),d=A.slice(b)}}a.loose||(c?a.loose=!0:this.rules.other.doubleBlankLine.test(g)&&(c=!0)),a.items.push({type:"list_item",raw:g,task:!!this.options.gfm&&this.rules.other.listIsTask.test(f),loose:!1,text:f,tokens:[]}),a.raw+=g}let l=a.items.at(-1);if(l)l.raw=l.raw.trimEnd(),l.text=l.text.trimEnd();else return;a.raw=a.raw.trimEnd();for(let p of a.items){if(this.lexer.state.top=!1,p.tokens=this.lexer.blockTokens(p.text,[]),p.task){if(p.text=p.text.replace(this.rules.other.listReplaceTask,""),((t=p.tokens[0])==null?void 0:t.type)==="text"||((n=p.tokens[0])==null?void 0:n.type)==="paragraph"){p.tokens[0].raw=p.tokens[0].raw.replace(this.rules.other.listReplaceTask,""),p.tokens[0].text=p.tokens[0].text.replace(this.rules.other.listReplaceTask,"");for(let f=this.lexer.inlineQueue.length-1;f>=0;f--)if(this.rules.other.listIsTask.test(this.lexer.inlineQueue[f].src)){this.lexer.inlineQueue[f].src=this.lexer.inlineQueue[f].src.replace(this.rules.other.listReplaceTask,"");break}}let g=this.rules.other.listTaskCheckbox.exec(p.raw);if(g){let f={type:"checkbox",raw:g[0]+" ",checked:g[0]!=="[ ]"};p.checked=f.checked,a.loose?p.tokens[0]&&["paragraph","text"].includes(p.tokens[0].type)&&"tokens"in p.tokens[0]&&p.tokens[0].tokens?(p.tokens[0].raw=f.raw+p.tokens[0].raw,p.tokens[0].text=f.raw+p.tokens[0].text,p.tokens[0].tokens.unshift(f)):p.tokens.unshift({type:"paragraph",raw:f.raw,text:f.raw,tokens:[f]}):p.tokens.unshift(f)}}if(!a.loose){let g=p.tokens.filter(d=>d.type==="space"),f=g.length>0&&g.some(d=>this.rules.other.anyLine.test(d.raw));a.loose=f}}if(a.loose)for(let p of a.items){p.loose=!0;for(let g of p.tokens)g.type==="text"&&(g.type="paragraph")}return a}}html(s){let e=this.rules.block.html.exec(s);if(e)return{type:"html",block:!0,raw:e[0],pre:e[1]==="pre"||e[1]==="script"||e[1]==="style",text:e[0]}}def(s){let e=this.rules.block.def.exec(s);if(e){let t=e[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal," "),n=e[2]?e[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",r=e[3]?e[3].substring(1,e[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):e[3];return{type:"def",tag:t,raw:e[0],href:n,title:r}}}table(s){var a;let e=this.rules.block.table.exec(s);if(!e||!this.rules.other.tableDelimiter.test(e[2]))return;let t=_e(e[1]),n=e[2].replace(this.rules.other.tableAlignChars,"").split("|"),r=(a=e[3])!=null&&a.trim()?e[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],o={type:"table",raw:e[0],header:[],align:[],rows:[]};if(t.length===n.length){for(let i of n)this.rules.other.tableAlignRight.test(i)?o.align.push("right"):this.rules.other.tableAlignCenter.test(i)?o.align.push("center"):this.rules.other.tableAlignLeft.test(i)?o.align.push("left"):o.align.push(null);for(let i=0;i<t.length;i++)o.header.push({text:t[i],tokens:this.lexer.inline(t[i]),header:!0,align:o.align[i]});for(let i of r)o.rows.push(_e(i,o.header.length).map((c,l)=>({text:c,tokens:this.lexer.inline(c),header:!1,align:o.align[l]})));return o}}lheading(s){let e=this.rules.block.lheading.exec(s);if(e)return{type:"heading",raw:e[0],depth:e[2].charAt(0)==="="?1:2,text:e[1],tokens:this.lexer.inline(e[1])}}paragraph(s){let e=this.rules.block.paragraph.exec(s);if(e){let t=e[1].charAt(e[1].length-1)===`
`?e[1].slice(0,-1):e[1];return{type:"paragraph",raw:e[0],text:t,tokens:this.lexer.inline(t)}}}text(s){let e=this.rules.block.text.exec(s);if(e)return{type:"text",raw:e[0],text:e[0],tokens:this.lexer.inline(e[0])}}escape(s){let e=this.rules.inline.escape.exec(s);if(e)return{type:"escape",raw:e[0],text:e[1]}}tag(s){let e=this.rules.inline.tag.exec(s);if(e)return!this.lexer.state.inLink&&this.rules.other.startATag.test(e[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(e[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(e[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(e[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:e[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:e[0]}}link(s){let e=this.rules.inline.link.exec(s);if(e){let t=e[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(t)){if(!this.rules.other.endAngleBracket.test(t))return;let o=M(t.slice(0,-1),"\\");if((t.length-o.length)%2===0)return}else{let o=Ft(e[2],"()");if(o===-2)return;if(o>-1){let a=(e[0].indexOf("!")===0?5:4)+e[1].length+o;e[2]=e[2].substring(0,o),e[0]=e[0].substring(0,a).trim(),e[3]=""}}let n=e[2],r="";if(this.options.pedantic){let o=this.rules.other.pedanticHrefTitle.exec(n);o&&(n=o[1],r=o[3])}else r=e[3]?e[3].slice(1,-1):"";return n=n.trim(),this.rules.other.startAngleBracket.test(n)&&(this.options.pedantic&&!this.rules.other.endAngleBracket.test(t)?n=n.slice(1):n=n.slice(1,-1)),ye(e,{href:n&&n.replace(this.rules.inline.anyPunctuation,"$1"),title:r&&r.replace(this.rules.inline.anyPunctuation,"$1")},e[0],this.lexer,this.rules)}}reflink(s,e){let t;if((t=this.rules.inline.reflink.exec(s))||(t=this.rules.inline.nolink.exec(s))){let n=(t[2]||t[1]).replace(this.rules.other.multipleSpaceGlobal," "),r=e[n.toLowerCase()];if(!r){let o=t[0].charAt(0);return{type:"text",raw:o,text:o}}return ye(t,r,t[0],this.lexer,this.rules)}}emStrong(s,e,t=""){let n=this.rules.inline.emStrongLDelim.exec(s);if(!(!n||n[3]&&t.match(this.rules.other.unicodeAlphaNumeric))&&(!(n[1]||n[2])||!t||this.rules.inline.punctuation.exec(t))){let r=[...n[0]].length-1,o,a,i=r,c=0,l=n[0][0]==="*"?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(l.lastIndex=0,e=e.slice(-1*s.length+r);(n=l.exec(e))!=null;){if(o=n[1]||n[2]||n[3]||n[4]||n[5]||n[6],!o)continue;if(a=[...o].length,n[3]||n[4]){i+=a;continue}else if((n[5]||n[6])&&r%3&&!((r+a)%3)){c+=a;continue}if(i-=a,i>0)continue;a=Math.min(a,a+i+c);let p=[...n[0]][0].length,g=s.slice(0,r+n.index+p+a);if(Math.min(r,a)%2){let d=g.slice(1,-1);return{type:"em",raw:g,text:d,tokens:this.lexer.inlineTokens(d)}}let f=g.slice(2,-2);return{type:"strong",raw:g,text:f,tokens:this.lexer.inlineTokens(f)}}}}codespan(s){let e=this.rules.inline.code.exec(s);if(e){let t=e[2].replace(this.rules.other.newLineCharGlobal," "),n=this.rules.other.nonSpaceChar.test(t),r=this.rules.other.startingSpaceChar.test(t)&&this.rules.other.endingSpaceChar.test(t);return n&&r&&(t=t.substring(1,t.length-1)),{type:"codespan",raw:e[0],text:t}}}br(s){let e=this.rules.inline.br.exec(s);if(e)return{type:"br",raw:e[0]}}del(s){let e=this.rules.inline.del.exec(s);if(e)return{type:"del",raw:e[0],text:e[2],tokens:this.lexer.inlineTokens(e[2])}}autolink(s){let e=this.rules.inline.autolink.exec(s);if(e){let t,n;return e[2]==="@"?(t=e[1],n="mailto:"+t):(t=e[1],n=t),{type:"link",raw:e[0],text:t,href:n,tokens:[{type:"text",raw:t,text:t}]}}}url(s){var t;let e;if(e=this.rules.inline.url.exec(s)){let n,r;if(e[2]==="@")n=e[0],r="mailto:"+n;else{let o;do o=e[0],e[0]=((t=this.rules.inline._backpedal.exec(e[0]))==null?void 0:t[0])??"";while(o!==e[0]);n=e[0],e[1]==="www."?r="http://"+e[0]:r=e[0]}return{type:"link",raw:e[0],text:n,href:r,tokens:[{type:"text",raw:n,text:n}]}}}inlineText(s){let e=this.rules.inline.text.exec(s);if(e){let t=this.lexer.state.inRawBlock;return{type:"text",raw:e[0],text:e[0],escaped:t}}}},S=class J{constructor(e){h(this,"tokens");h(this,"options");h(this,"state");h(this,"inlineQueue");h(this,"tokenizer");this.tokens=[],this.tokens.links=Object.create(null),this.options=e||I,this.options.tokenizer=this.options.tokenizer||new W,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,top:!0};let t={other:_,block:F.normal,inline:B.normal};this.options.pedantic?(t.block=F.pedantic,t.inline=B.pedantic):this.options.gfm&&(t.block=F.gfm,this.options.breaks?t.inline=B.breaks:t.inline=B.gfm),this.tokenizer.rules=t}static get rules(){return{block:F,inline:B}}static lex(e,t){return new J(t).lex(e)}static lexInline(e,t){return new J(t).inlineTokens(e)}lex(e){e=e.replace(_.carriageReturn,`
`),this.blockTokens(e,this.tokens);for(let t=0;t<this.inlineQueue.length;t++){let n=this.inlineQueue[t];this.inlineTokens(n.src,n.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(e,t=[],n=!1){var r,o,a;for(this.options.pedantic&&(e=e.replace(_.tabCharGlobal,"    ").replace(_.spaceLine,""));e;){let i;if((o=(r=this.options.extensions)==null?void 0:r.block)!=null&&o.some(l=>(i=l.call({lexer:this},e,t))?(e=e.substring(i.raw.length),t.push(i),!0):!1))continue;if(i=this.tokenizer.space(e)){e=e.substring(i.raw.length);let l=t.at(-1);i.raw.length===1&&l!==void 0?l.raw+=`
`:t.push(i);continue}if(i=this.tokenizer.code(e)){e=e.substring(i.raw.length);let l=t.at(-1);(l==null?void 0:l.type)==="paragraph"||(l==null?void 0:l.type)==="text"?(l.raw+=(l.raw.endsWith(`
`)?"":`
`)+i.raw,l.text+=`
`+i.text,this.inlineQueue.at(-1).src=l.text):t.push(i);continue}if(i=this.tokenizer.fences(e)){e=e.substring(i.raw.length),t.push(i);continue}if(i=this.tokenizer.heading(e)){e=e.substring(i.raw.length),t.push(i);continue}if(i=this.tokenizer.hr(e)){e=e.substring(i.raw.length),t.push(i);continue}if(i=this.tokenizer.blockquote(e)){e=e.substring(i.raw.length),t.push(i);continue}if(i=this.tokenizer.list(e)){e=e.substring(i.raw.length),t.push(i);continue}if(i=this.tokenizer.html(e)){e=e.substring(i.raw.length),t.push(i);continue}if(i=this.tokenizer.def(e)){e=e.substring(i.raw.length);let l=t.at(-1);(l==null?void 0:l.type)==="paragraph"||(l==null?void 0:l.type)==="text"?(l.raw+=(l.raw.endsWith(`
`)?"":`
`)+i.raw,l.text+=`
`+i.raw,this.inlineQueue.at(-1).src=l.text):this.tokens.links[i.tag]||(this.tokens.links[i.tag]={href:i.href,title:i.title},t.push(i));continue}if(i=this.tokenizer.table(e)){e=e.substring(i.raw.length),t.push(i);continue}if(i=this.tokenizer.lheading(e)){e=e.substring(i.raw.length),t.push(i);continue}let c=e;if((a=this.options.extensions)!=null&&a.startBlock){let l=1/0,p=e.slice(1),g;this.options.extensions.startBlock.forEach(f=>{g=f.call({lexer:this},p),typeof g=="number"&&g>=0&&(l=Math.min(l,g))}),l<1/0&&l>=0&&(c=e.substring(0,l+1))}if(this.state.top&&(i=this.tokenizer.paragraph(c))){let l=t.at(-1);n&&(l==null?void 0:l.type)==="paragraph"?(l.raw+=(l.raw.endsWith(`
`)?"":`
`)+i.raw,l.text+=`
`+i.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=l.text):t.push(i),n=c.length!==e.length,e=e.substring(i.raw.length);continue}if(i=this.tokenizer.text(e)){e=e.substring(i.raw.length);let l=t.at(-1);(l==null?void 0:l.type)==="text"?(l.raw+=(l.raw.endsWith(`
`)?"":`
`)+i.raw,l.text+=`
`+i.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=l.text):t.push(i);continue}if(e){let l="Infinite loop on byte: "+e.charCodeAt(0);if(this.options.silent){console.error(l);break}else throw new Error(l)}}return this.state.top=!0,t}inline(e,t=[]){return this.inlineQueue.push({src:e,tokens:t}),t}inlineTokens(e,t=[]){var c,l,p,g,f;let n=e,r=null;if(this.tokens.links){let d=Object.keys(this.tokens.links);if(d.length>0)for(;(r=this.tokenizer.rules.inline.reflinkSearch.exec(n))!=null;)d.includes(r[0].slice(r[0].lastIndexOf("[")+1,-1))&&(n=n.slice(0,r.index)+"["+"a".repeat(r[0].length-2)+"]"+n.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))}for(;(r=this.tokenizer.rules.inline.anyPunctuation.exec(n))!=null;)n=n.slice(0,r.index)+"++"+n.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);let o;for(;(r=this.tokenizer.rules.inline.blockSkip.exec(n))!=null;)o=r[2]?r[2].length:0,n=n.slice(0,r.index+o)+"["+"a".repeat(r[0].length-o-2)+"]"+n.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);n=((l=(c=this.options.hooks)==null?void 0:c.emStrongMask)==null?void 0:l.call({lexer:this},n))??n;let a=!1,i="";for(;e;){a||(i=""),a=!1;let d;if((g=(p=this.options.extensions)==null?void 0:p.inline)!=null&&g.some(u=>(d=u.call({lexer:this},e,t))?(e=e.substring(d.raw.length),t.push(d),!0):!1))continue;if(d=this.tokenizer.escape(e)){e=e.substring(d.raw.length),t.push(d);continue}if(d=this.tokenizer.tag(e)){e=e.substring(d.raw.length),t.push(d);continue}if(d=this.tokenizer.link(e)){e=e.substring(d.raw.length),t.push(d);continue}if(d=this.tokenizer.reflink(e,this.tokens.links)){e=e.substring(d.raw.length);let u=t.at(-1);d.type==="text"&&(u==null?void 0:u.type)==="text"?(u.raw+=d.raw,u.text+=d.text):t.push(d);continue}if(d=this.tokenizer.emStrong(e,n,i)){e=e.substring(d.raw.length),t.push(d);continue}if(d=this.tokenizer.codespan(e)){e=e.substring(d.raw.length),t.push(d);continue}if(d=this.tokenizer.br(e)){e=e.substring(d.raw.length),t.push(d);continue}if(d=this.tokenizer.del(e)){e=e.substring(d.raw.length),t.push(d);continue}if(d=this.tokenizer.autolink(e)){e=e.substring(d.raw.length),t.push(d);continue}if(!this.state.inLink&&(d=this.tokenizer.url(e))){e=e.substring(d.raw.length),t.push(d);continue}let k=e;if((f=this.options.extensions)!=null&&f.startInline){let u=1/0,b=e.slice(1),y;this.options.extensions.startInline.forEach(C=>{y=C.call({lexer:this},b),typeof y=="number"&&y>=0&&(u=Math.min(u,y))}),u<1/0&&u>=0&&(k=e.substring(0,u+1))}if(d=this.tokenizer.inlineText(k)){e=e.substring(d.raw.length),d.raw.slice(-1)!=="_"&&(i=d.raw.slice(-1)),a=!0;let u=t.at(-1);(u==null?void 0:u.type)==="text"?(u.raw+=d.raw,u.text+=d.text):t.push(d);continue}if(e){let u="Infinite loop on byte: "+e.charCodeAt(0);if(this.options.silent){console.error(u);break}else throw new Error(u)}}return t}},G=class{constructor(s){h(this,"options");h(this,"parser");this.options=s||I}space(s){return""}code({text:s,lang:e,escaped:t}){var o;let n=(o=(e||"").match(_.notSpaceStart))==null?void 0:o[0],r=s.replace(_.endingNewline,"")+`
`;return n?'<pre><code class="language-'+E(n)+'">'+(t?r:E(r,!0))+`</code></pre>
`:"<pre><code>"+(t?r:E(r,!0))+`</code></pre>
`}blockquote({tokens:s}){return`<blockquote>
${this.parser.parse(s)}</blockquote>
`}html({text:s}){return s}def(s){return""}heading({tokens:s,depth:e}){return`<h${e}>${this.parser.parseInline(s)}</h${e}>
`}hr(s){return`<hr>
`}list(s){let e=s.ordered,t=s.start,n="";for(let a=0;a<s.items.length;a++){let i=s.items[a];n+=this.listitem(i)}let r=e?"ol":"ul",o=e&&t!==1?' start="'+t+'"':"";return"<"+r+o+`>
`+n+"</"+r+`>
`}listitem(s){return`<li>${this.parser.parse(s.tokens)}</li>
`}checkbox({checked:s}){return"<input "+(s?'checked="" ':"")+'disabled="" type="checkbox"> '}paragraph({tokens:s}){return`<p>${this.parser.parseInline(s)}</p>
`}table(s){let e="",t="";for(let r=0;r<s.header.length;r++)t+=this.tablecell(s.header[r]);e+=this.tablerow({text:t});let n="";for(let r=0;r<s.rows.length;r++){let o=s.rows[r];t="";for(let a=0;a<o.length;a++)t+=this.tablecell(o[a]);n+=this.tablerow({text:t})}return n&&(n=`<tbody>${n}</tbody>`),`<table>
<thead>
`+e+`</thead>
`+n+`</table>
`}tablerow({text:s}){return`<tr>
${s}</tr>
`}tablecell(s){let e=this.parser.parseInline(s.tokens),t=s.header?"th":"td";return(s.align?`<${t} align="${s.align}">`:`<${t}>`)+e+`</${t}>
`}strong({tokens:s}){return`<strong>${this.parser.parseInline(s)}</strong>`}em({tokens:s}){return`<em>${this.parser.parseInline(s)}</em>`}codespan({text:s}){return`<code>${E(s,!0)}</code>`}br(s){return"<br>"}del({tokens:s}){return`<del>${this.parser.parseInline(s)}</del>`}link({href:s,title:e,tokens:t}){let n=this.parser.parseInline(t),r=ve(s);if(r===null)return n;s=r;let o='<a href="'+s+'"';return e&&(o+=' title="'+E(e)+'"'),o+=">"+n+"</a>",o}image({href:s,title:e,text:t,tokens:n}){n&&(t=this.parser.parseInline(n,this.parser.textRenderer));let r=ve(s);if(r===null)return E(t);s=r;let o=`<img src="${s}" alt="${t}"`;return e&&(o+=` title="${E(e)}"`),o+=">",o}text(s){return"tokens"in s&&s.tokens?this.parser.parseInline(s.tokens):"escaped"in s&&s.escaped?s.text:E(s.text)}},pe=class{strong({text:s}){return s}em({text:s}){return s}codespan({text:s}){return s}del({text:s}){return s}html({text:s}){return s}text({text:s}){return s}link({text:s}){return""+s}image({text:s}){return""+s}br(){return""}checkbox({raw:s}){return s}},$=class ee{constructor(e){h(this,"options");h(this,"renderer");h(this,"textRenderer");this.options=e||I,this.options.renderer=this.options.renderer||new G,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new pe}static parse(e,t){return new ee(t).parse(e)}static parseInline(e,t){return new ee(t).parseInline(e)}parse(e){var n,r;let t="";for(let o=0;o<e.length;o++){let a=e[o];if((r=(n=this.options.extensions)==null?void 0:n.renderers)!=null&&r[a.type]){let c=a,l=this.options.extensions.renderers[c.type].call({parser:this},c);if(l!==!1||!["space","hr","heading","code","table","blockquote","list","html","def","paragraph","text"].includes(c.type)){t+=l||"";continue}}let i=a;switch(i.type){case"space":{t+=this.renderer.space(i);break}case"hr":{t+=this.renderer.hr(i);break}case"heading":{t+=this.renderer.heading(i);break}case"code":{t+=this.renderer.code(i);break}case"table":{t+=this.renderer.table(i);break}case"blockquote":{t+=this.renderer.blockquote(i);break}case"list":{t+=this.renderer.list(i);break}case"checkbox":{t+=this.renderer.checkbox(i);break}case"html":{t+=this.renderer.html(i);break}case"def":{t+=this.renderer.def(i);break}case"paragraph":{t+=this.renderer.paragraph(i);break}case"text":{t+=this.renderer.text(i);break}default:{let c='Token with "'+i.type+'" type was not found.';if(this.options.silent)return console.error(c),"";throw new Error(c)}}}return t}parseInline(e,t=this.renderer){var r,o;let n="";for(let a=0;a<e.length;a++){let i=e[a];if((o=(r=this.options.extensions)==null?void 0:r.renderers)!=null&&o[i.type]){let l=this.options.extensions.renderers[i.type].call({parser:this},i);if(l!==!1||!["escape","html","link","image","strong","em","codespan","br","del","text"].includes(i.type)){n+=l||"";continue}}let c=i;switch(c.type){case"escape":{n+=t.text(c);break}case"html":{n+=t.html(c);break}case"link":{n+=t.link(c);break}case"image":{n+=t.image(c);break}case"checkbox":{n+=t.checkbox(c);break}case"strong":{n+=t.strong(c);break}case"em":{n+=t.em(c);break}case"codespan":{n+=t.codespan(c);break}case"br":{n+=t.br(c);break}case"del":{n+=t.del(c);break}case"text":{n+=t.text(c);break}default:{let l='Token with "'+c.type+'" type was not found.';if(this.options.silent)return console.error(l),"";throw new Error(l)}}}return n}},q,H=(q=class{constructor(s){h(this,"options");h(this,"block");this.options=s||I}preprocess(s){return s}postprocess(s){return s}processAllTokens(s){return s}emStrongMask(s){return s}provideLexer(){return this.block?S.lex:S.lexInline}provideParser(){return this.block?$.parse:$.parseInline}},h(q,"passThroughHooks",new Set(["preprocess","postprocess","processAllTokens","emStrongMask"])),h(q,"passThroughHooksRespectAsync",new Set(["preprocess","postprocess","processAllTokens"])),q),Fe=class{constructor(...s){h(this,"defaults",re());h(this,"options",this.setOptions);h(this,"parse",this.parseMarkdown(!0));h(this,"parseInline",this.parseMarkdown(!1));h(this,"Parser",$);h(this,"Renderer",G);h(this,"TextRenderer",pe);h(this,"Lexer",S);h(this,"Tokenizer",W);h(this,"Hooks",H);this.use(...s)}walkTokens(s,e){var n,r;let t=[];for(let o of s)switch(t=t.concat(e.call(this,o)),o.type){case"table":{let a=o;for(let i of a.header)t=t.concat(this.walkTokens(i.tokens,e));for(let i of a.rows)for(let c of i)t=t.concat(this.walkTokens(c.tokens,e));break}case"list":{let a=o;t=t.concat(this.walkTokens(a.items,e));break}default:{let a=o;(r=(n=this.defaults.extensions)==null?void 0:n.childTokens)!=null&&r[a.type]?this.defaults.extensions.childTokens[a.type].forEach(i=>{let c=a[i].flat(1/0);t=t.concat(this.walkTokens(c,e))}):a.tokens&&(t=t.concat(this.walkTokens(a.tokens,e)))}}return t}use(...s){let e=this.defaults.extensions||{renderers:{},childTokens:{}};return s.forEach(t=>{let n={...t};if(n.async=this.defaults.async||n.async||!1,t.extensions&&(t.extensions.forEach(r=>{if(!r.name)throw new Error("extension name required");if("renderer"in r){let o=e.renderers[r.name];o?e.renderers[r.name]=function(...a){let i=r.renderer.apply(this,a);return i===!1&&(i=o.apply(this,a)),i}:e.renderers[r.name]=r.renderer}if("tokenizer"in r){if(!r.level||r.level!=="block"&&r.level!=="inline")throw new Error("extension level must be 'block' or 'inline'");let o=e[r.level];o?o.unshift(r.tokenizer):e[r.level]=[r.tokenizer],r.start&&(r.level==="block"?e.startBlock?e.startBlock.push(r.start):e.startBlock=[r.start]:r.level==="inline"&&(e.startInline?e.startInline.push(r.start):e.startInline=[r.start]))}"childTokens"in r&&r.childTokens&&(e.childTokens[r.name]=r.childTokens)}),n.extensions=e),t.renderer){let r=this.defaults.renderer||new G(this.defaults);for(let o in t.renderer){if(!(o in r))throw new Error(`renderer '${o}' does not exist`);if(["options","parser"].includes(o))continue;let a=o,i=t.renderer[a],c=r[a];r[a]=(...l)=>{let p=i.apply(r,l);return p===!1&&(p=c.apply(r,l)),p||""}}n.renderer=r}if(t.tokenizer){let r=this.defaults.tokenizer||new W(this.defaults);for(let o in t.tokenizer){if(!(o in r))throw new Error(`tokenizer '${o}' does not exist`);if(["options","rules","lexer"].includes(o))continue;let a=o,i=t.tokenizer[a],c=r[a];r[a]=(...l)=>{let p=i.apply(r,l);return p===!1&&(p=c.apply(r,l)),p}}n.tokenizer=r}if(t.hooks){let r=this.defaults.hooks||new H;for(let o in t.hooks){if(!(o in r))throw new Error(`hook '${o}' does not exist`);if(["options","block"].includes(o))continue;let a=o,i=t.hooks[a],c=r[a];H.passThroughHooks.has(o)?r[a]=l=>{if(this.defaults.async&&H.passThroughHooksRespectAsync.has(o))return(async()=>{let g=await i.call(r,l);return c.call(r,g)})();let p=i.call(r,l);return c.call(r,p)}:r[a]=(...l)=>{if(this.defaults.async)return(async()=>{let g=await i.apply(r,l);return g===!1&&(g=await c.apply(r,l)),g})();let p=i.apply(r,l);return p===!1&&(p=c.apply(r,l)),p}}n.hooks=r}if(t.walkTokens){let r=this.defaults.walkTokens,o=t.walkTokens;n.walkTokens=function(a){let i=[];return i.push(o.call(this,a)),r&&(i=i.concat(r.call(this,a))),i}}this.defaults={...this.defaults,...n}}),this}setOptions(s){return this.defaults={...this.defaults,...s},this}lexer(s,e){return S.lex(s,e??this.defaults)}parser(s,e){return $.parse(s,e??this.defaults)}parseMarkdown(s){return(e,t)=>{let n={...t},r={...this.defaults,...n},o=this.onError(!!r.silent,!!r.async);if(this.defaults.async===!0&&n.async===!1)return o(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof e>"u"||e===null)return o(new Error("marked(): input parameter is undefined or null"));if(typeof e!="string")return o(new Error("marked(): input parameter is of type "+Object.prototype.toString.call(e)+", string expected"));if(r.hooks&&(r.hooks.options=r,r.hooks.block=s),r.async)return(async()=>{let a=r.hooks?await r.hooks.preprocess(e):e,i=await(r.hooks?await r.hooks.provideLexer():s?S.lex:S.lexInline)(a,r),c=r.hooks?await r.hooks.processAllTokens(i):i;r.walkTokens&&await Promise.all(this.walkTokens(c,r.walkTokens));let l=await(r.hooks?await r.hooks.provideParser():s?$.parse:$.parseInline)(c,r);return r.hooks?await r.hooks.postprocess(l):l})().catch(o);try{r.hooks&&(e=r.hooks.preprocess(e));let a=(r.hooks?r.hooks.provideLexer():s?S.lex:S.lexInline)(e,r);r.hooks&&(a=r.hooks.processAllTokens(a)),r.walkTokens&&this.walkTokens(a,r.walkTokens);let i=(r.hooks?r.hooks.provideParser():s?$.parse:$.parseInline)(a,r);return r.hooks&&(i=r.hooks.postprocess(i)),i}catch(a){return o(a)}}}onError(s,e){return t=>{if(t.message+=`
Please report this to https://github.com/markedjs/marked.`,s){let n="<p>An error occurred:</p><pre>"+E(t.message+"",!0)+"</pre>";return e?Promise.resolve(n):n}if(e)return Promise.reject(t);throw t}}},T=new Fe;function w(s,e){return T.parse(s,e)}w.options=w.setOptions=function(s){return T.setOptions(s),w.defaults=T.defaults,Pe(w.defaults),w};w.getDefaults=re;w.defaults=I;w.use=function(...s){return T.use(...s),w.defaults=T.defaults,Pe(w.defaults),w};w.walkTokens=function(s,e){return T.walkTokens(s,e)};w.parseInline=T.parseInline;w.Parser=$;w.parser=$.parse;w.Renderer=G;w.TextRenderer=pe;w.Lexer=S;w.lexer=S.lex;w.Tokenizer=W;w.Hooks=H;w.parse=w;w.options;w.setOptions;w.use;w.walkTokens;w.parseInline;$.parse;S.lex;const Se=document.createElement("div");function x(s){return Se.textContent=s,Se.innerHTML}const Ot={Read:"file_path",ReadFile:"file_path",Write:"file_path",Edit:"file_path",Glob:"pattern",Grep:"pattern",Bash:"command",WebFetch:"url",WebSearch:"query",Task:"description",NotebookEdit:"notebook_path"},$e=80;function ue(s,e){if(!e||typeof e!="object")return"";const t=e,n=Ot[s];if(n&&t[n]!=null)return Ee(String(t[n]),$e);for(const r of Object.values(t))if(typeof r=="string"&&r.length>0)return Ee(r,$e);return""}function Ee(s,e){const t=s.replace(/\n/g," ");return t.length<=e?t:t.slice(0,e-1)+"…"}let R=null;function Kt(){if(R)return R;R=new Fe;const s={gfm:!0,breaks:!1};return R.setOptions(s),R.use({renderer:{code(e){const t=e.lang?x(e.lang):"",n=x(e.text);return`<div class="thinkt-code-block">
          <div class="thinkt-code-block__header">
            ${t?`<span class="thinkt-code-block__lang">${t}</span>`:'<span class="thinkt-code-block__lang">code</span>'}
            <button class="thinkt-copy-btn" data-copy-action="code">Copy</button>
          </div>
          <pre><code>${n}</code></pre>
        </div>`},html(e){return x(e.text)}}}),R}function te(s){return Kt().parse(s,{async:!1})}function z(s){return s==null||s<=0?"":s<1e3?`${s}ms`:`${(s/1e3).toFixed(1)}s`}function Zt(s){return s.replace(/[^a-z0-9\s-]/gi,"").replace(/\s+/g,"-").substring(0,50).toLowerCase()||"conversation"}function Te(s,e,t){const n=new Blob([s],{type:t}),r=URL.createObjectURL(n),o=document.createElement("a");o.href=r,o.download=e,document.body.appendChild(o),o.click(),document.body.removeChild(o),URL.revokeObjectURL(r)}const Wt=`
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
`;function Gt(s,e,t){const n=t??{user:!0,assistant:!0,thinking:!0,toolUse:!0,toolResult:!0,system:!1};let r=`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${x(e)}</title>
  <style>${Wt}</style>
</head>
<body>
  <h1>${x(e)}</h1>
`;const o=new Map;for(const i of s)for(const c of i.contentBlocks||[])if(c.type==="tool_result"){const l=c;o.set(l.toolUseId,l)}const a=new Set;for(const i of s){const c=(i.role||"unknown").toLowerCase(),l=i.timestamp?new Date(i.timestamp).toLocaleString():"",p=c==="user",g=c==="assistant",f=c==="system";if(p&&!n.user||g&&!n.assistant||f&&!n.system||!p&&!g&&!f)continue;let d="",k=!1;if(i.contentBlocks&&i.contentBlocks.length>0)for(const u of i.contentBlocks)switch(u.type){case"text":{u.text&&u.text.trim()&&(d+=`      <div class="text">${te(u.text)}</div>
`,k=!0);break}case"thinking":{n.thinking&&(d+=Qt(u),k=!0);break}case"tool_use":{if(n.toolUse){const b=u,y=o.get(b.toolUseId);y&&a.add(b.toolUseId),d+=Vt(b,y,n),k=!0}break}case"tool_result":{const b=u;n.toolResult&&!a.has(b.toolUseId)&&(d+=Xt(b),k=!0);break}}(!i.contentBlocks||i.contentBlocks.length===0)&&i.text&&i.text.trim()&&(d+=`      <div class="text">${te(i.text)}</div>
`,k=!0),k&&(r+=`  <div class="entry">
`,r+=`    <div class="entry-header">
`,r+=`      <span class="role role-${c}">${x(c)}</span>
`,l&&(r+=`      <span class="timestamp">${x(l)}</span>
`),r+=`    </div>
`,r+=`    <div class="content">
`,r+=d,r+=`    </div>
`,r+=`  </div>
`)}return r+=`  <div class="meta">Exported from THINKT on ${new Date().toLocaleString()}</div>
</body>
</html>`,r}function Qt(s){return`      <div class="thinking">
        <div class="thinking-header">
          <span class="thinking-toggle">▶</span>
          <span class="thinking-label">Thinking${s.durationMs?` (${z(s.durationMs)})`:""}</span>
        </div>
        <div class="thinking-content">${x(s.thinking||"")}</div>
      </div>
`}function Vt(s,e,t){const n=JSON.stringify(s.toolInput,null,2),r=ue(s.toolName,s.toolInput),o=r?`<span class="tool-summary">(${x(r)})</span>`:"";let a="";if(e&&t.toolResult){const i=e.isError?"tool-result--error":"",c=e.isError?"Error":"Result",l=e.durationMs?` (${z(e.durationMs)})`:"";a=`
        <div class="tool-result-inline ${i}">
          <div class="tool-header">
            <span class="tool-toggle">▶</span>
            <span class="tool-label">${c}${l}</span>
          </div>
          <div class="tool-content">${x(String(e.toolResult||""))}</div>
        </div>`}return`      <div class="tool">
        <div class="tool-header">
          <span class="tool-toggle">▶</span>
          <span class="tool-bullet">•</span>
          <span class="tool-name">${x(s.toolName)}</span>
          ${o}
        </div>
        <div class="tool-content">${x(n)}</div>${a}
      </div>
`}function Xt(s){const e=s.isError?"tool tool-error":"tool tool-result",t=s.isError?"Error":"Result",n=s.durationMs?` (${z(s.durationMs)})`:"";return`      <div class="${e}">
        <div class="tool-header">
          <span class="tool-toggle">▶</span>
          <span class="tool-label">${t}${n}</span>
        </div>
        <div class="tool-content">${x(String(s.toolResult||""))}</div>
      </div>
`}function Yt(s,e,t){const n=t??{user:!0,assistant:!0,thinking:!0,toolUse:!0,toolResult:!0,system:!1};let r=`# ${e}

`;const o=new Map;for(const i of s)for(const c of i.contentBlocks||[])if(c.type==="tool_result"){const l=c;o.set(l.toolUseId,l)}const a=new Set;for(const i of s){const c=(i.role||"unknown").toLowerCase(),l=c==="user",p=c==="assistant",g=c==="system";if(l&&!n.user||p&&!n.assistant||g&&!n.system||!l&&!p&&!g)continue;let f="";if(i.contentBlocks&&i.contentBlocks.length>0)for(const k of i.contentBlocks)switch(k.type){case"text":{k.text&&k.text.trim()&&(f+=k.text+`

`);break}case"thinking":{if(n.thinking){const u=k,b=u.durationMs?` (${z(u.durationMs)})`:"";f+=`<details>
<summary>Thinking${b}</summary>

\`\`\`
${u.thinking||""}
\`\`\`

</details>

`}break}case"tool_use":{if(n.toolUse){const u=k,b=JSON.stringify(u.toolInput,null,2),y=ue(u.toolName,u.toolInput),C=y?` (${y})`:"";f+=`<details>
<summary>Tool: ${u.toolName}${C}</summary>

\`\`\`json
${b}
\`\`\`

</details>

`;const L=o.get(u.toolUseId);if(L&&(a.add(u.toolUseId),n.toolResult)){const U=L.isError?"Error":"Result";f+=`<details>
<summary>${U}</summary>

\`\`\`
${String(L.toolResult||"")}
\`\`\`

</details>

`}}break}case"tool_result":{const u=k;if(n.toolResult&&!a.has(u.toolUseId)){const b=u.isError?"Error":"Result";f+=`<details>
<summary>${b}</summary>

\`\`\`
${String(u.toolResult||"")}
\`\`\`

</details>

`}break}}if((!i.contentBlocks||i.contentBlocks.length===0)&&i.text&&i.text.trim()&&(f+=i.text+`

`),!f.trim())continue;const d=i.timestamp?new Date(i.timestamp).toLocaleString():"";r+=`---

`,r+=`## ${c.charAt(0).toUpperCase()+c.slice(1)}`,d&&(r+=` (${d})`),r+=`

`,r+=f}return r+=`---

*Exported from THINKT on ${new Date().toLocaleString()}*
`,r}class Jt{constructor(e){h(this,"container");h(this,"contentContainer");h(this,"filterContainer");h(this,"toolbarContainer");h(this,"stylesInjected",!1);h(this,"client",null);h(this,"filterState",{user:!0,assistant:!0,thinking:!1,toolUse:!1,toolResult:!1,system:!1});h(this,"currentProjectPath",null);h(this,"currentEntryCount",0);h(this,"currentEntries",[]);h(this,"toolResultIndex",new Map);h(this,"inlinedToolResults",new Set);h(this,"boundFilterHandlers",new Map);h(this,"availableApps",[]);h(this,"exportDropdownOpen",!1);this.container=e.elements.container,this.client=e.client??null,this.init(),this.fetchAvailableApps()}init(){this.injectStyles(),this.container.className="thinkt-conversation-view",this.createStructure(),this.setupFilters()}injectStyles(){if(this.stylesInjected)return;const e="thinkt-conversation-view-styles";if(!document.getElementById(e)){const t=document.createElement("style");t.id=e,t.textContent=at,document.head.appendChild(t)}this.stylesInjected=!0}createStructure(){this.toolbarContainer=document.createElement("div"),this.toolbarContainer.className="thinkt-conversation-view__toolbar",this.renderToolbar(),this.container.appendChild(this.toolbarContainer),this.filterContainer=document.createElement("div"),this.filterContainer.className="thinkt-conversation-view__filters",this.renderFilterBar(),this.container.appendChild(this.filterContainer),this.contentContainer=document.createElement("div"),this.contentContainer.className="thinkt-conversation-view__content",this.container.appendChild(this.contentContainer),this.contentContainer.addEventListener("click",e=>this.handleContentClick(e)),this.showEmpty()}handleContentClick(e){const t=e.target,n=t.closest(".thinkt-thinking-block__header");if(n){const a=n.closest(".thinkt-thinking-block");a==null||a.classList.toggle("expanded");return}const r=t.closest(".thinkt-tool-call__summary");if(r){const a=r.closest(".thinkt-tool-call");a==null||a.classList.toggle("expanded");return}const o=t.closest(".thinkt-copy-btn");if(o){this.handleCopy(o);return}}async handleCopy(e){let t="";const n=e.dataset.copyAction;if(n==="code"){const r=e.closest(".thinkt-code-block"),o=r==null?void 0:r.querySelector("code");t=(o==null?void 0:o.textContent)??""}else if(n==="text"){const r=e.closest(".thinkt-conversation-entry__text");if(r){const o=r.cloneNode(!0);o.querySelectorAll(".thinkt-copy-btn").forEach(a=>a.remove()),t=o.textContent??""}}else if(n==="detail"){const r=e.closest(".thinkt-tool-call__detail-content");if(r){const o=r.cloneNode(!0);o.querySelectorAll(".thinkt-copy-btn").forEach(a=>a.remove()),t=o.textContent??""}}if(t)try{await navigator.clipboard.writeText(t);const r=e.textContent;e.textContent="✓",setTimeout(()=>{e.textContent=r},1500)}catch{}}async fetchAvailableApps(){if(this.client)try{this.availableApps=await this.client.getOpenInApps(),this.renderToolbar()}catch{}}renderToolbar(){const e=this.currentProjectPath??"No project selected",t=this.currentEntryCount,n=this.availableApps.filter(r=>r.enabled).map(r=>`
        <div class="thinkt-conversation-view__toolbar-dropdown-item" data-action="${x(r.id??"")}">
          Open in ${x(r.name??r.id??"")}
        </div>
      `).join("");this.toolbarContainer.innerHTML=`
      <div class="thinkt-conversation-view__toolbar-path">
        <span class="thinkt-conversation-view__toolbar-path-icon">📁</span>
        <span class="thinkt-conversation-view__toolbar-path-text" title="${x(e)}">${x(e)}</span>
        <div class="thinkt-conversation-view__toolbar-path-actions">
          <div class="thinkt-conversation-view__toolbar-actions">
            <button class="thinkt-conversation-view__toolbar-btn" id="toolbar-open-btn">
              Open ▼
            </button>
            <div class="thinkt-conversation-view__toolbar-dropdown" id="toolbar-dropdown">
              ${n}
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
    `,this.setupToolbarActions()}setupToolbarActions(){const e=this.toolbarContainer.querySelector("#toolbar-open-btn"),t=this.toolbarContainer.querySelector("#toolbar-dropdown");!e||!t||(e.addEventListener("click",n=>{n.stopPropagation(),t.classList.toggle("open")}),document.addEventListener("click",()=>{t.classList.remove("open")}),t.querySelectorAll(".thinkt-conversation-view__toolbar-dropdown-item").forEach(n=>{n.addEventListener("click",r=>{r.stopPropagation();const o=n.dataset.action;this.handleToolbarAction(o??""),t.classList.remove("open")})}))}async handleToolbarAction(e){if(this.currentProjectPath){if(e==="copy"){try{await navigator.clipboard.writeText(this.currentProjectPath)}catch{}return}if(this.client)try{await this.client.openIn(e,this.currentProjectPath)}catch{try{await navigator.clipboard.writeText(this.currentProjectPath)}catch{}}else try{await navigator.clipboard.writeText(this.currentProjectPath)}catch{}}}setProjectPath(e,t){this.currentProjectPath=e,t!==void 0&&(this.currentEntryCount=t),this.renderToolbar()}renderFilterBar(){const e=this.currentEntries.length>0;this.filterContainer.innerHTML=`
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
    `,this.setupExportHandlers()}setupExportHandlers(){const e=this.filterContainer.querySelector("#export-btn"),t=this.filterContainer.querySelector("#export-dropdown");!e||!t||(e.addEventListener("click",n=>{n.stopPropagation(),this.exportDropdownOpen=!this.exportDropdownOpen,this.exportDropdownOpen?(this.positionDropdown(e,t),t.classList.add("open")):t.classList.remove("open")}),document.addEventListener("click",()=>{this.exportDropdownOpen&&(this.exportDropdownOpen=!1,t.classList.remove("open"))}),t.querySelectorAll(".thinkt-conversation-view__export-dropdown-item").forEach(n=>{n.addEventListener("click",r=>{r.stopPropagation();const o=n.dataset.format;o&&this.handleExport(o),this.exportDropdownOpen=!1,t.classList.remove("open")})}))}positionDropdown(e,t){const n=e.getBoundingClientRect();t.style.top=`${n.bottom+4}px`,t.style.right=`${window.innerWidth-n.right}px`}handleExport(e){const t=this.currentProjectPath?`${this.currentProjectPath.split("/").pop()||"conversation"}`:"conversation",n={user:this.filterState.user,assistant:this.filterState.assistant,thinking:this.filterState.thinking,toolUse:this.filterState.toolUse,toolResult:this.filterState.toolResult,system:this.filterState.system};if(this.currentEntries.length===0)return;const r=Zt(t);if(e==="html"){const o=Gt(this.currentEntries,t,n);Te(o,`${r}.html`,"text/html")}else if(e==="markdown"){const o=Yt(this.currentEntries,t,n);Te(o,`${r}.md`,"text/markdown")}}setupFilters(){this.filterContainer.querySelectorAll(".thinkt-conversation-view__filter-btn").forEach(t=>{const n=t,r=n.dataset.filter;if(!r)return;const o=()=>{this.filterState[r]=!this.filterState[r],n.classList.toggle("active",this.filterState[r]),this.applyFilters()};n.addEventListener("click",o),this.boundFilterHandlers.set(n,o)})}applyFilters(){this.contentContainer.querySelectorAll("[data-role]").forEach(e=>{const t=e,n=t.dataset.role,r=t.dataset.blockType;let o=!1;n==="user"?o=!this.filterState.user:n==="assistant"?o=!this.filterState.assistant:n==="system"&&(o=!this.filterState.system),!o&&r&&(r==="thinking"?o=!this.filterState.thinking:r==="toolUse"?o=!this.filterState.toolUse:r==="toolResult"&&(o=!this.filterState.toolResult)),t.classList.toggle("hidden",o)})}getFilterState(){return{...this.filterState}}setFilterState(e){Object.assign(this.filterState,e),this.renderFilterBar(),this.setupFilters(),this.applyFilters()}buildToolResultIndex(e){this.toolResultIndex.clear(),this.inlinedToolResults.clear();for(const t of e)if(t.contentBlocks){for(const n of t.contentBlocks)if(n.type==="tool_result"){const r=n;this.toolResultIndex.set(r.toolUseId,r)}}}displaySession(e){if(this.contentContainer.innerHTML="",this.currentEntries=e.entries||[],this.currentEntries.length===0){this.showEmpty(),this.renderFilterBar();return}this.buildToolResultIndex(this.currentEntries);for(const t of this.currentEntries){const n=this.renderEntry(t);this.contentContainer.appendChild(n)}this.renderFilterBar(),this.setupFilters(),this.applyFilters(),this.contentContainer.scrollTop=0}displayEntries(e){if(this.contentContainer.innerHTML="",this.currentEntries=e||[],this.currentEntries.length===0){this.showEmpty(),this.renderFilterBar();return}this.buildToolResultIndex(this.currentEntries);for(const t of this.currentEntries){const n=this.renderEntry(t);this.contentContainer.appendChild(n)}this.currentEntryCount=this.currentEntries.length,this.renderToolbar(),this.renderFilterBar(),this.setupFilters(),this.applyFilters(),this.contentContainer.scrollTop=0}renderEntry(e){var c;const t=document.createDocumentFragment(),n=e.role||"unknown",r=e.timestamp?new Date(e.timestamp).toLocaleString():"";if(!((c=e.contentBlocks)!=null&&c.length)){if(e.text){const l=n==="assistant"?this.renderAssistantText(e.text):this.renderPlainText(e.text);t.appendChild(this.createTextCard(n,r,l))}return t}let o="",a=!0;const i=()=>{o&&(t.appendChild(this.createTextCard(n,a?r:"",o)),o="",a=!1)};for(const l of e.contentBlocks)switch(l.type){case"text":l.text&&l.text.trim()&&(o+=n==="assistant"?this.renderAssistantText(l.text):this.renderPlainText(l.text));break;case"thinking":i(),t.appendChild(this.createStandaloneBlock(n,"thinking",this.renderThinkingBlock(l.thinking||"",l.durationMs)));break;case"tool_use":i(),t.appendChild(this.createStandaloneBlock(n,"toolUse",this.renderToolCall(l.toolUseId,l.toolName,l.toolInput)));break;case"tool_result":this.inlinedToolResults.has(l.toolUseId)||(i(),t.appendChild(this.createStandaloneBlock(n,"toolResult",this.renderToolResultBlock(l))));break}return i(),t}createTextCard(e,t,n){const r=document.createElement("div");r.className="thinkt-conversation-entry",r.dataset.role=e,r.dataset.blockType="text";const o=`thinkt-conversation-entry__role--${e}`;return r.innerHTML=`
      <div class="thinkt-conversation-entry__header">
        <span class="thinkt-conversation-entry__role ${o}">${x(e)}</span>
        ${t?`<span class="thinkt-conversation-entry__timestamp">${x(t)}</span>`:""}
      </div>
      <div class="thinkt-conversation-entry__content">${n}</div>
    `,r}createStandaloneBlock(e,t,n){const r=document.createElement("div");return r.className="thinkt-standalone-block",r.dataset.role=e,r.dataset.blockType=t,r.innerHTML=n,r}renderAssistantText(e){return`<div class="thinkt-conversation-entry__text thinkt-conversation-entry__text--markdown">${te(e)}<button class="thinkt-copy-btn thinkt-copy-btn--float" data-copy-action="text">Copy</button></div>`}renderPlainText(e){return`<div class="thinkt-conversation-entry__text">${x(e)}</div>`}renderToolResultBlock(e){const t=e.isError?"thinkt-conversation-entry__tool-result--error":"",n=e.isError?"Error":"Result";return`
      <div class="thinkt-conversation-entry__tool-result ${t}">
        <div class="thinkt-conversation-entry__tool-result-label">${n}</div>
        <div class="thinkt-conversation-entry__text">${x(String(e.toolResult||""))}</div>
      </div>
    `}renderThinkingBlock(e,t){const n=z(t),r=n?`<span class="thinkt-thinking-block__duration">(${x(n)})</span>`:"",o=e.replace(/\n/g," ").slice(0,80),a=o?`<span class="thinkt-thinking-block__preview">${x(o)}${e.length>80?"…":""}</span>`:"";return`
      <div class="thinkt-thinking-block" data-type="thinking">
        <div class="thinkt-thinking-block__header">
          <span class="thinkt-thinking-block__toggle">▶</span>
          <span class="thinkt-thinking-block__label">Thinking</span>
          ${r}
          ${a}
        </div>
        <div class="thinkt-thinking-block__content">${x(e)}</div>
      </div>
    `}renderToolCall(e,t,n){const r=ue(t,n),o=r?`<span class="thinkt-tool-call__arg">(${x(r)})</span>`:"",a=this.toolResultIndex.get(e);let i,c="",l="";if(a){this.inlinedToolResults.add(e),a.isError?i='<span class="thinkt-tool-call__status thinkt-tool-call__status--error">✗</span>':i='<span class="thinkt-tool-call__status thinkt-tool-call__status--ok">✓</span>';const g=z(a.durationMs);g&&(l=`<span class="thinkt-tool-call__duration">${x(g)}</span>`);const f=a.isError?" thinkt-tool-call__detail-result--error":"",d=a.isError?"Error":"Result";c=`
        <div class="thinkt-tool-call__detail-section thinkt-tool-call__detail-result${f}">
          <div class="thinkt-tool-call__detail-label">${d}</div>
          <div class="thinkt-tool-call__detail-content">${x(String(a.toolResult||""))}<button class="thinkt-copy-btn thinkt-copy-btn--float" data-copy-action="detail">Copy</button></div>
        </div>
      `}else i='<span class="thinkt-tool-call__status thinkt-tool-call__status--pending">•</span>';const p=x(JSON.stringify(n,null,2));return`
      <div class="thinkt-tool-call" data-type="toolUse" data-tool-use-id="${x(e)}">
        <div class="thinkt-tool-call__summary">
          <span class="thinkt-tool-call__toggle">▶</span>
          <span class="thinkt-tool-call__bullet">•</span>
          <span class="thinkt-tool-call__name">${x(t)}</span>
          ${o}
          ${l}
          ${i}
        </div>
        <div class="thinkt-tool-call__detail">
          <div class="thinkt-tool-call__detail-section">
            <div class="thinkt-tool-call__detail-label">Input</div>
            <div class="thinkt-tool-call__detail-content">${p}<button class="thinkt-copy-btn thinkt-copy-btn--float" data-copy-action="detail">Copy</button></div>
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
    `,this.renderFilterBar()}clear(){this.showEmpty()}dispose(){this.boundFilterHandlers.forEach((e,t)=>{t.removeEventListener("click",e)}),this.boundFilterHandlers.clear(),this.container.innerHTML=""}}const en=`
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
}

.thinkt-api-viewer__sessions {
  flex: 1;
  overflow: hidden;
  min-height: 200px;
}

.thinkt-api-viewer__viewer {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--thinkt-bg-color, #0a0a0a);
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
`;class tn{constructor(e){h(this,"elements");h(this,"options");h(this,"client");h(this,"projectBrowser",null);h(this,"sessionList",null);h(this,"conversationView",null);h(this,"currentProject",null);h(this,"currentSession",null);h(this,"isLoadingSession",!1);h(this,"boundHandlers",[]);h(this,"disposed",!1);h(this,"stylesInjected",!1);this.elements=e.elements,this.options=e,this.client=e.client??se(),this.init()}init(){this.injectStyles(),this.createStructure(),this.initializeComponentsAsync()}injectStyles(){if(this.stylesInjected)return;const e="thinkt-api-viewer-styles";if(!document.getElementById(e)){const t=document.createElement("style");t.id=e,t.textContent=en,document.head.appendChild(t)}this.stylesInjected=!0}createStructure(){const{container:e}=this.elements;e.className="thinkt-api-viewer";const t=document.createElement("div");t.className="thinkt-api-viewer__sidebar";const n=document.createElement("div");n.className="thinkt-api-viewer__projects",n.appendChild(this.elements.projectBrowserContainer),t.appendChild(n);const r=document.createElement("div");if(r.className="thinkt-api-viewer__sessions",r.appendChild(this.elements.sessionListContainer),t.appendChild(r),e.appendChild(t),this.elements.resizer)e.appendChild(this.elements.resizer);else{const a=document.createElement("div");a.className="thinkt-api-viewer__resizer",this.elements.resizer=a,e.appendChild(a),this.setupResizer()}const o=document.createElement("div");o.className="thinkt-api-viewer__viewer",o.appendChild(this.elements.viewerContainer),e.appendChild(o)}setupResizer(){const{resizer:e,container:t}=this.elements;if(!e)return;const n=t.querySelector(".thinkt-api-viewer__sidebar");if(!n)return;let r=!1;const o=c=>{r=!0,document.body.style.cursor="col-resize",c.preventDefault()},a=c=>{if(!r)return;const l=c.clientX;l>=250&&l<=600&&(n.style.width=`${l}px`)},i=()=>{r=!1,document.body.style.cursor=""};e.addEventListener("mousedown",o),document.addEventListener("mousemove",a),document.addEventListener("mouseup",i),this.boundHandlers.push(()=>{e.removeEventListener("mousedown",o),document.removeEventListener("mousemove",a),document.removeEventListener("mouseup",i)})}async initializeComponentsAsync(){await this.checkConnection(),this.projectBrowser=new nt({elements:{container:this.elements.projectBrowserContainer},client:this.client,onProjectSelect:e=>{this.handleProjectSelect(e)},onError:e=>{this.handleError(e)}}),this.sessionList=new it({elements:{container:this.elements.sessionListContainer},client:this.client,onSessionSelect:e=>{this.handleSessionSelect(e)},onError:e=>{this.handleError(e)}}),this.conversationView=new Jt({elements:{container:this.elements.viewerContainer},client:this.client})}async checkConnection(){try{await this.client.getSources(),this.updateConnectionStatus(!0)}catch(e){this.updateConnectionStatus(!1,e instanceof Error?e.message:"Connection failed")}}updateConnectionStatus(e,t){const n=document.getElementById("global-status");if(!n)return;n.classList.remove("connected","error","connecting"),n.classList.add(e?"connected":"error");const r=n.querySelector(".status-text");r&&(r.textContent=e?"Connected":t??"Disconnected")}handleProjectSelect(e){var t,n;this.currentProject=e,e.id&&((t=this.sessionList)==null||t.setProjectId(e.id)),(n=this.conversationView)==null||n.setProjectPath(e.path??e.name??null,0)}async handleSessionSelect(e){var t,n,r;if(!this.isLoadingSession){this.isLoadingSession=!0;try{const o=e.fullPath;if(!o)throw new Error("Session has no path");const a=await this.client.getAllSessionEntries(o);this.currentSession={meta:e,entries:a},(t=this.conversationView)==null||t.displayEntries(a),Promise.resolve((r=(n=this.options).onSessionLoaded)==null?void 0:r.call(n,e,a))}catch(o){this.handleError(o instanceof Error?o:new Error(String(o)))}finally{this.isLoadingSession=!1}}}handleError(e){var t,n;console.error("ApiViewer error:",e),(n=(t=this.options).onError)==null||n.call(t,e),this.updateConnectionStatus(!1,e.message)}getCurrentProject(){return this.currentProject}getCurrentSession(){return this.currentSession}async loadSession(e){const t=await this.client.getSession(e);await this.handleSessionSelect(t.meta)}refreshProjects(){var e;return((e=this.projectBrowser)==null?void 0:e.refresh())??Promise.resolve()}getProjectBrowser(){return this.projectBrowser}getSessionList(){return this.sessionList}getConversationView(){return this.conversationView}focusProjectSearch(){var e;(e=this.projectBrowser)==null||e.focusSearch()}focusSessionSearch(){var e;(e=this.sessionList)==null||e.focusSearch()}dispose(){var e,t,n;this.disposed||(this.boundHandlers.forEach(r=>r()),this.boundHandlers=[],(e=this.projectBrowser)==null||e.dispose(),(t=this.sessionList)==null||t.dispose(),(n=this.conversationView)==null||n.dispose(),this.projectBrowser=null,this.sessionList=null,this.conversationView=null,this.currentProject=null,this.currentSession=null,this.disposed=!0)}}function qe(){if(typeof window<"u"){const e=new URLSearchParams(window.location.search).get("api-url");if(e)try{return new URL(e),console.log("[THINKT] Using API URL from query parameter:",e),e}catch{console.error("[THINKT] Invalid API URL in query parameter:",e)}}if(typeof window<"u"&&window.THINKT_API_URL){const s=window.THINKT_API_URL;return console.log("[THINKT] Using API URL from global variable:",s),s}if(typeof document<"u"){const s=document.querySelector('meta[name="thinkt-api-url"]');if(s!=null&&s.getAttribute("content")){const e=s.getAttribute("content");return console.log("[THINKT] Using API URL from meta tag:",e),e}}return typeof window<"u"?(console.log("[THINKT] Using API URL from same origin:",window.location.origin),window.location.origin):(console.log("[THINKT] Using default API URL: http://localhost:8784"),"http://localhost:8784")}const Oe=["en","zh","es"],Ke="thinkt-locale";async function nn(){const s=localStorage.getItem(Ke);return s&&Oe.includes(s)?s:"en"}async function sn(s){localStorage.setItem(Ke,s)}let v=null,O=null;async function Ie(){const s=await nn();rn(s);const e=qe();et({baseUrl:e}),console.log("[THINKT] API App initializing..."),console.log(`[THINKT] API base URL: ${e}`),console.log(`[THINKT] Language: ${s}`);const t={container:document.getElementById("app"),projectBrowserContainer:document.getElementById("project-browser"),sessionListContainer:document.getElementById("session-list"),viewerContainer:document.getElementById("viewer-container"),resizer:document.getElementById("resizer")};for(const[n,r]of Object.entries(t))if(!r){console.error(`[THINKT] Required element not found: ${n}`);return}v=new tn({elements:t,onSessionLoaded:(n,r)=>{console.log(`[THINKT] Loaded session: ${n.id} (${r.length} entries)`),an(n.firstPrompt??n.id??"Session")},onError:n=>{K("error",n.message)}}),cn(),hn(),on(),console.log("[THINKT] API App initialized")}function rn(s){const e=document.getElementById("lang-select");e&&(e.value=s,e.addEventListener("change",async t=>{const n=t.target.value;Oe.includes(n)&&(await sn(n),console.log(`[THINKT] Language changed to: ${n}`),window.location.reload())}))}function on(){const s=document.getElementById("loading");s&&(s.classList.add("hidden"),setTimeout(()=>s.remove(),300))}function an(s){document.title=`${s} - THINKT`}function K(s,e){const t=document.getElementById("global-status");if(!t)return;t.classList.remove("connected","error","connecting"),t.classList.add(s);const n=t.querySelector(".status-text");n&&(n.textContent=e??(s==="connected"?"Connected":"Disconnected"))}function ln(s){return s instanceof HTMLElement?s.tagName==="INPUT"||s.tagName==="TEXTAREA"||s.isContentEditable:!1}function cn(){document.addEventListener("keydown",s=>{var e;if((s.ctrlKey||s.metaKey)&&s.key==="r"){s.preventDefault();const t=v==null?void 0:v.refreshProjects();t&&t.catch(n=>{});return}if(s.key==="Escape"){(e=document.getElementById("app"))==null||e.focus();return}if(s.key==="/"&&!s.ctrlKey&&!s.metaKey&&!s.altKey){if(ln(s.target))return;s.preventDefault(),(v==null?void 0:v.getCurrentProject())?v==null||v.focusSessionSearch():v==null||v.focusProjectSearch()}})}function hn(){Ce(),O=setInterval(()=>{Ce()},3e4)}async function Ce(){try{const s=qe(),e=await fetch(`${s}/api/v1/sources`,{method:"GET",headers:{Accept:"application/json"},signal:AbortSignal.timeout(5e3)});e.ok?K("connected"):K("error",`HTTP ${e.status}`)}catch(s){K("error",s instanceof Error?s.message:"Connection failed")}}function dn(){O!==null&&(clearInterval(O),O=null),v==null||v.dispose(),v=null}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{Ie()}):Ie();window.addEventListener("beforeunload",dn);
