export type Lang = 'es' | 'en';

const T = {
  // --- CreatePage ---
  titlePlaceholder:       { es: 'Título de la tier list',         en: 'Tier list title' },
  startLive:              { es: 'Iniciar sesión en vivo',         en: 'Start live session' },
  creatingTierList:       { es: 'Creando tier list...',           en: 'Creating tier list...' },
  uploadingItems:         { es: 'Subiendo items {i}/{n}...',      en: 'Uploading items {i}/{n}...' },
  creatingSession:        { es: 'Creando sesión...',              en: 'Creating session...' },
  missingTitle:           { es: 'poné un título arriba',          en: 'add a title above' },
  missingItems:           { es: 'subí al menos un item',          en: 'add at least one item' },
  missingTiers:           { es: 'se necesitan al menos 2 tiers',  en: 'at least 2 tiers required' },
  missingTierName:        { es: 'hay una tier sin nombre (nombrala o eliminala con ⚙)', en: 'a tier has no name (name it or delete it with ⚙)' },
  toStart:                { es: 'Para iniciar:',                  en: 'To start:' },
  tierPlaceholder:        { es: 'Los items se colocan acá durante la sesión en vivo', en: 'Items are placed here during the live session' },
  editTier:               { es: 'Editar tier',                    en: 'Edit tier' },
  moveUp:                 { es: 'Subir',                          en: 'Move up' },
  moveDown:               { es: 'Bajar',                          en: 'Move down' },
  tierNamePlaceholder:    { es: 'Nombre de la tier',              en: 'Tier name' },
  deleteTier:             { es: 'Eliminar tier',                  en: 'Delete tier' },
  addTier:                { es: '+ Agregar tier',                 en: '+ Add tier' },
  imageBankLabel:         { es: 'Items ({n}) — arrastrá imágenes acá o', en: 'Items ({n}) — drag images here or' },
  uploadImages:           { es: 'Subir imágenes',                 en: 'Upload images' },
  noItems:                { es: 'Todavía no hay items',           en: 'No items yet' },
  removeItem:             { es: 'Quitar',                         en: 'Remove' },
  dragFromWebError:       { es: 'No llegó ningún archivo. Si arrastrás desde otra página web no funciona: guardá la imagen y subila desde tu explorador de archivos.', en: 'No file received. Dragging from another webpage does not work: save the image first and upload it from your file explorer.' },
  unsupportedFiles:       { es: '{n} archivo{s} no soportado{s} (formato: {types}). Solo PNG, JPG, WebP o GIF.', en: '{n} unsupported file{s} (format: {types}). Only PNG, JPG, WebP or GIF.' },
  sessionCode:            { es: 'Código de sesión',               en: 'Session code' },
  goToHost:               { es: 'Ir a la vista de host →',        en: 'Go to host view →' },

  // --- HostPage ---
  codeLabel:              { es: 'Código:',                        en: 'Code:' },
  noStreamerToken:         { es: 'No hay token de streamer para esta sesión en este navegador.', en: 'No streamer token for this session in this browser.' },
  connecting:             { es: 'Conectando...',                  en: 'Connecting...' },
  dragToTier:             { es: 'Arrastrá el item a una tier para revelar los votos', en: 'Drag the item to a tier to reveal the votes' },
  chatVoted:              { es: 'Así votó el chat —',             en: 'Chat voted —' },
  nextItem:               { es: 'Siguiente item →',               en: 'Next item →' },
  noItemsLeft:            { es: 'No quedan items.',               en: 'No items left.' },
  finish:                 { es: 'Finalizar',                      en: 'Finish' },
  loadingNext:            { es: 'Cargando siguiente item...',     en: 'Loading next item...' },
  finishSession:          { es: 'Finalizar sesión',               en: 'Finish session' },
  shareCode:              { es: 'Compartí el código con tu audiencia y arrancá cuando quieras.', en: 'Share the code with your audience and start when you\'re ready.' },
  begin:                  { es: 'COMENZAR',                       en: 'START' },

  // --- VotePage ---
  waitingToStart:         { es: 'Esperando a que el streamer comience...', en: 'Waiting for the streamer to start...' },
  whichTier:              { es: '¿En qué tier va?',               en: 'Which tier?' },
  voteRegistered:         { es: '✓ Voto registrado',              en: '✓ Vote registered' },
  waitingDecision:        { es: 'Esperando a que el streamer decida...', en: 'Waiting for the streamer to decide...' },
  waitingNext:            { es: 'Esperando el próximo item...',   en: 'Waiting for the next item...' },
  matchedStreamer:         { es: '🎯 ¡Coincidiste con el streamer!', en: '🎯 You matched the streamer!' },
  streamerPlacedIn:       { es: 'El streamer la puso en',         en: 'The streamer placed it in' },
  youVotedDifferent:      { es: '— vos votaste distinto',         en: '— you voted differently' },
  didntVote:              { es: 'No votaste este item',            en: 'You didn\'t vote on this item' },
  waitingItem:            { es: 'Esperando el próximo item...',   en: 'Waiting for the next item...' },

  // --- ComparisonView ---
  matchLabel:             { es: 'Coincidencia streamer vs chat',  en: 'Streamer vs chat match' },
  greenBorderNote:        { es: 'Los items con borde verde coinciden en ambas listas', en: 'Items with a green border match in both lists' },
  streamerBoard:          { es: 'Streamer',                       en: 'Streamer' },
  chatBoard:              { es: 'Chat',                           en: 'Chat' },

  newTierList:            { es: 'Nueva tier list',               en: 'New tier list' },

  // --- Shared ---
  vote:                   { es: 'voto',                           en: 'vote' },
  votes:                  { es: 'votos',                          en: 'votes' },
  fromChat:               { es: 'del chat',                       en: 'from chat' },
} as const;

export type TKey = keyof typeof T;
export default T;
