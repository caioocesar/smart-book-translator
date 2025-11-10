// Internationalization utility for Smart Book Translator
// Supports: English (en), Portuguese (pt), Spanish (es)

const translations = {
  en: {
    // Header
    appTitle: 'Smart Book Translator',
    systemStatus: 'System Status',
    online: 'Online',
    offline: 'Offline',
    
    // Tabs
    tabTranslation: 'Translation',
    tabHistory: 'History',
    tabGlossary: 'Glossary',
    tabSettings: 'Settings',
    
    // Translation Tab
    uploadDocument: 'Upload Document',
    dragDropHint: 'Drag and drop a file here, or click to select',
    supportedFormats: 'Supported formats: EPUB, DOCX, PDF',
    sourceLanguage: 'Source Language',
    targetLanguage: 'Target Language',
    translationAPI: 'Translation API',
    apiKey: 'API Key',
    apiKeyPlaceholder: 'Enter your API key',
    outputFormat: 'Output Format',
    startTranslation: 'Start Translation',
    testConnection: 'Test Connection',
    refreshLimits: 'Refresh Limits',
    apiLimits: 'API Limits',
    noApiKey: 'No API key required for Google Translate',
    
    // API Providers
    providerDeepL: 'DeepL',
    providerOpenAI: 'OpenAI',
    providerChatGPT: 'ChatGPT',
    providerGoogle: 'Google Translate (Free)',
    
    // History Tab
    translationHistory: 'Translation History',
    refresh: 'Refresh',
    refreshing: 'Refreshing...',
    noHistory: 'No translation history yet',
    noHistoryHint: 'Your completed and in-progress translations will appear here',
    showDetails: 'Show Details',
    hideDetails: 'Hide Details',
    download: 'Download',
    retryFailed: 'Retry Failed',
    retryAll: 'Retry All',
    deleteJob: 'Delete',
    generateDocument: 'Generate Document',
    generating: 'Generating...',
    inProgress: 'In Progress...',
    
    // Job Status
    statusPending: 'Pending',
    statusTranslating: 'Translating',
    statusCompleted: 'Completed',
    statusFailed: 'Failed',
    statusPartial: 'Partial',
    
    // Job Details
    languages: 'Languages',
    api: 'API',
    format: 'Format',
    started: 'Started',
    chunks: 'chunks',
    failed: 'failed',
    output: 'Output',
    error: 'Error',
    
    // Chunk Details
    translationChunks: 'Translation Chunks',
    chunkNumber: 'Chunk',
    loadingChunks: 'Loading chunks...',
    source: 'Source',
    translation: 'Translation',
    retries: 'Retries',
    showOnlyFailed: 'Show only failed chunks',
    pending: 'Pending',
    willProcessSoon: 'Will process soon',
    retryNow: 'Now',
    minutes: 'min',
    seconds: 'sec',
    openDirectory: 'Open Directory',
    allStatuses: 'All Statuses',
    translating: 'Translating',
    completed: 'Completed',
    failed: 'Failed',
    nextRetry: 'Next Retry',
    notScheduled: 'Not scheduled',
    storageUsed: 'Storage Used',
    clearAll: 'Clear All',
    clearAllData: 'Clear All Data',
    clearAllWarning: 'This will delete ALL translation jobs, chunks, and uploaded files. This action cannot be undone!',
    clearAllConfirm: 'Yes, Clear All',
    clearAllSuccess: 'All data cleared successfully',
    clearAllFailed: 'Failed to clear data',
    
    // Progress Visualization
    progressOverview: 'Progress Overview',
    completedChunks: 'Completed',
    failedChunks: 'Failed',
    pendingChunks: 'Pending',
    translatingChunks: 'Translating',
    totalChunks: 'Total Chunks',
    
    // Glossary Tab
    glossaryManagement: 'Glossary Management',
    addTerm: 'Add Term',
    sourceTerm: 'Source Term',
    targetTerm: 'Target Term',
    category: 'Category',
    notes: 'Notes',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    importCSV: 'Import CSV',
    exportCSV: 'Export CSV',
    searchOnline: 'Search Online for Terms',
    searchTerm: 'Search Term',
    search: 'Search',
    
    // Settings Tab
    apiConfiguration: 'API Configuration',
    deeplApiKey: 'DeepL API Key',
    openaiApiKey: 'OpenAI API Key',
    chatgptApiKey: 'ChatGPT API Key',
    outputDirectory: 'Output Directory',
    chunkSize: 'Chunk Size',
    saveSettings: 'Save Settings',
    getCredentials: 'How to get credentials',
    
    // API Help Guides
    apiHelpTitle: 'How to Get API Credentials',
    deeplGuide: 'DeepL API Guide',
    openaiGuide: 'OpenAI API Guide',
    googleGuide: 'Google Translate Guide',
    
    // Privacy Modal
    privacyTitle: 'Privacy & Legal Notice',
    privacyLocalStorage: 'Local Storage & Privacy',
    privacyLegal: 'Legal & Copyright',
    privacyApiUsage: 'API Usage',
    privacyAccept: 'I Understand & Accept',
    learnMore: 'Learn more',
    
    // Footer
    footerNotice: 'Important: This program is for personal translation use only. All translations are stored locally on your device. Do not use for commercial purposes or copyright infringement. Respect intellectual property rights and applicable laws.',
    version: 'Made with ❤️ for personal use',
    
    // Messages
    uploading: 'Uploading...',
    translating: 'Translating...',
    success: 'Success',
    errorOccurred: 'An error occurred',
    confirmDelete: 'Delete this translation job? This cannot be undone.',
    
    // Connection Test
    connectionSuccess: 'Connection successful!',
    connectionFailed: 'Connection failed',
    testing: 'Testing...',
    
    // Languages
    langEnglish: 'English',
    langSpanish: 'Spanish',
    langFrench: 'French',
    langGerman: 'German',
    langItalian: 'Italian',
    langPortuguese: 'Portuguese',
    langRussian: 'Russian',
    langJapanese: 'Japanese',
    langChinese: 'Chinese',
    langArabic: 'Arabic',
    
    // UI Language
    uiLanguage: 'Interface Language',
  },
  
  pt: {
    // Header
    appTitle: 'Tradutor Inteligente de Livros',
    systemStatus: 'Status do Sistema',
    online: 'Online',
    offline: 'Offline',
    
    // Tabs
    tabTranslation: 'Tradução',
    tabHistory: 'Histórico',
    tabGlossary: 'Glossário',
    tabSettings: 'Configurações',
    
    // Translation Tab
    uploadDocument: 'Enviar Documento',
    dragDropHint: 'Arraste e solte um arquivo aqui, ou clique para selecionar',
    supportedFormats: 'Formatos suportados: EPUB, DOCX, PDF',
    sourceLanguage: 'Idioma de Origem',
    targetLanguage: 'Idioma de Destino',
    translationAPI: 'API de Tradução',
    apiKey: 'Chave da API',
    apiKeyPlaceholder: 'Digite sua chave da API',
    outputFormat: 'Formato de Saída',
    startTranslation: 'Iniciar Tradução',
    testConnection: 'Testar Conexão',
    refreshLimits: 'Atualizar Limites',
    apiLimits: 'Limites da API',
    noApiKey: 'Nenhuma chave de API necessária para Google Translate',
    
    // API Providers
    providerDeepL: 'DeepL',
    providerOpenAI: 'OpenAI',
    providerChatGPT: 'ChatGPT',
    providerGoogle: 'Google Translate (Grátis)',
    
    // History Tab
    translationHistory: 'Histórico de Traduções',
    refresh: 'Atualizar',
    refreshing: 'Atualizando...',
    noHistory: 'Nenhum histórico de tradução ainda',
    noHistoryHint: 'Suas traduções concluídas e em andamento aparecerão aqui',
    showDetails: 'Mostrar Detalhes',
    hideDetails: 'Ocultar Detalhes',
    download: 'Baixar',
    retryFailed: 'Tentar Novamente Falhas',
    retryAll: 'Tentar Tudo Novamente',
    deleteJob: 'Excluir',
    generateDocument: 'Gerar Documento',
    generating: 'Gerando...',
    inProgress: 'Em Progresso...',
    
    // Job Status
    statusPending: 'Pendente',
    statusTranslating: 'Traduzindo',
    statusCompleted: 'Concluído',
    statusFailed: 'Falhou',
    statusPartial: 'Parcial',
    
    // Job Details
    languages: 'Idiomas',
    api: 'API',
    format: 'Formato',
    started: 'Iniciado',
    chunks: 'partes',
    failed: 'falharam',
    output: 'Saída',
    error: 'Erro',
    
    // Chunk Details
    translationChunks: 'Partes da Tradução',
    chunkNumber: 'Parte',
    loadingChunks: 'Carregando partes...',
    source: 'Origem',
    translation: 'Tradução',
    retries: 'Tentativas',
    showOnlyFailed: 'Mostrar apenas partes falhadas',
    pending: 'Pendente',
    willProcessSoon: 'Será processado em breve',
    retryNow: 'Agora',
    minutes: 'min',
    seconds: 'seg',
    openDirectory: 'Abrir Diretório',
    allStatuses: 'Todos os Status',
    translating: 'Traduzindo',
    completed: 'Concluído',
    failed: 'Falhado',
    nextRetry: 'Próxima Tentativa',
    notScheduled: 'Não agendado',
    storageUsed: 'Armazenamento Usado',
    clearAll: 'Limpar Tudo',
    clearAllData: 'Limpar Todos os Dados',
    clearAllWarning: 'Isso excluirá TODOS os trabalhos de tradução, partes e arquivos enviados. Esta ação não pode ser desfeita!',
    clearAllConfirm: 'Sim, Limpar Tudo',
    clearAllSuccess: 'Todos os dados foram limpos com sucesso',
    clearAllFailed: 'Falha ao limpar dados',
    
    // Progress Visualization
    progressOverview: 'Visão Geral do Progresso',
    completedChunks: 'Concluídas',
    failedChunks: 'Falhadas',
    pendingChunks: 'Pendentes',
    translatingChunks: 'Traduzindo',
    totalChunks: 'Total de Partes',
    
    // Glossary Tab
    glossaryManagement: 'Gerenciamento de Glossário',
    addTerm: 'Adicionar Termo',
    sourceTerm: 'Termo de Origem',
    targetTerm: 'Termo de Destino',
    category: 'Categoria',
    notes: 'Notas',
    edit: 'Editar',
    delete: 'Excluir',
    save: 'Salvar',
    cancel: 'Cancelar',
    importCSV: 'Importar CSV',
    exportCSV: 'Exportar CSV',
    searchOnline: 'Buscar Termos Online',
    searchTerm: 'Buscar Termo',
    search: 'Buscar',
    
    // Settings Tab
    apiConfiguration: 'Configuração da API',
    deeplApiKey: 'Chave da API DeepL',
    openaiApiKey: 'Chave da API OpenAI',
    chatgptApiKey: 'Chave da API ChatGPT',
    outputDirectory: 'Diretório de Saída',
    chunkSize: 'Tamanho da Parte',
    saveSettings: 'Salvar Configurações',
    getCredentials: 'Como obter credenciais',
    
    // API Help Guides
    apiHelpTitle: 'Como Obter Credenciais da API',
    deeplGuide: 'Guia da API DeepL',
    openaiGuide: 'Guia da API OpenAI',
    googleGuide: 'Guia do Google Translate',
    
    // Privacy Modal
    privacyTitle: 'Aviso de Privacidade e Legal',
    privacyLocalStorage: 'Armazenamento Local e Privacidade',
    privacyLegal: 'Legal e Direitos Autorais',
    privacyApiUsage: 'Uso da API',
    privacyAccept: 'Eu Entendo e Aceito',
    learnMore: 'Saiba mais',
    
    // Footer
    footerNotice: 'Importante: Este programa é apenas para uso pessoal de tradução. Todas as traduções são armazenadas localmente no seu dispositivo. Não use para fins comerciais ou violação de direitos autorais. Respeite os direitos de propriedade intelectual e as leis aplicáveis.',
    version: 'Feito com ❤️ para uso pessoal',
    
    // Messages
    uploading: 'Enviando...',
    translating: 'Traduzindo...',
    success: 'Sucesso',
    errorOccurred: 'Ocorreu um erro',
    confirmDelete: 'Excluir este trabalho de tradução? Isso não pode ser desfeito.',
    
    // Connection Test
    connectionSuccess: 'Conexão bem-sucedida!',
    connectionFailed: 'Falha na conexão',
    testing: 'Testando...',
    
    // Languages
    langEnglish: 'Inglês',
    langSpanish: 'Espanhol',
    langFrench: 'Francês',
    langGerman: 'Alemão',
    langItalian: 'Italiano',
    langPortuguese: 'Português',
    langRussian: 'Russo',
    langJapanese: 'Japonês',
    langChinese: 'Chinês',
    langArabic: 'Árabe',
    
    // UI Language
    uiLanguage: 'Idioma da Interface',
  },
  
  es: {
    // Header
    appTitle: 'Traductor Inteligente de Libros',
    systemStatus: 'Estado del Sistema',
    online: 'En línea',
    offline: 'Desconectado',
    
    // Tabs
    tabTranslation: 'Traducción',
    tabHistory: 'Historial',
    tabGlossary: 'Glosario',
    tabSettings: 'Configuración',
    
    // Translation Tab
    uploadDocument: 'Subir Documento',
    dragDropHint: 'Arrastra y suelta un archivo aquí, o haz clic para seleccionar',
    supportedFormats: 'Formatos soportados: EPUB, DOCX, PDF',
    sourceLanguage: 'Idioma de Origen',
    targetLanguage: 'Idioma de Destino',
    translationAPI: 'API de Traducción',
    apiKey: 'Clave de API',
    apiKeyPlaceholder: 'Ingresa tu clave de API',
    outputFormat: 'Formato de Salida',
    startTranslation: 'Iniciar Traducción',
    testConnection: 'Probar Conexión',
    refreshLimits: 'Actualizar Límites',
    apiLimits: 'Límites de API',
    noApiKey: 'No se requiere clave de API para Google Translate',
    
    // API Providers
    providerDeepL: 'DeepL',
    providerOpenAI: 'OpenAI',
    providerChatGPT: 'ChatGPT',
    providerGoogle: 'Google Translate (Gratis)',
    
    // History Tab
    translationHistory: 'Historial de Traducciones',
    refresh: 'Actualizar',
    refreshing: 'Actualizando...',
    noHistory: 'No hay historial de traducción aún',
    noHistoryHint: 'Tus traducciones completadas y en progreso aparecerán aquí',
    showDetails: 'Mostrar Detalles',
    hideDetails: 'Ocultar Detalles',
    download: 'Descargar',
    retryFailed: 'Reintentar Fallidos',
    retryAll: 'Reintentar Todo',
    deleteJob: 'Eliminar',
    generateDocument: 'Generar Documento',
    generating: 'Generando...',
    inProgress: 'En Progreso...',
    
    // Job Status
    statusPending: 'Pendiente',
    statusTranslating: 'Traduciendo',
    statusCompleted: 'Completado',
    statusFailed: 'Fallido',
    statusPartial: 'Parcial',
    
    // Job Details
    languages: 'Idiomas',
    api: 'API',
    format: 'Formato',
    started: 'Iniciado',
    chunks: 'partes',
    failed: 'fallaron',
    output: 'Salida',
    error: 'Error',
    
    // Chunk Details
    translationChunks: 'Partes de la Traducción',
    chunkNumber: 'Parte',
    loadingChunks: 'Cargando partes...',
    source: 'Origen',
    translation: 'Traducción',
    retries: 'Reintentos',
    showOnlyFailed: 'Mostrar solo partes fallidas',
    pending: 'Pendiente',
    willProcessSoon: 'Se procesará pronto',
    retryNow: 'Ahora',
    minutes: 'min',
    seconds: 'seg',
    openDirectory: 'Abrir Directorio',
    allStatuses: 'Todos los Estados',
    translating: 'Traduciendo',
    completed: 'Completado',
    failed: 'Fallido',
    nextRetry: 'Próximo Reintento',
    notScheduled: 'No programado',
    storageUsed: 'Almacenamiento Usado',
    clearAll: 'Limpiar Todo',
    clearAllData: 'Limpiar Todos los Datos',
    clearAllWarning: 'Esto eliminará TODOS los trabajos de traducción, partes y archivos subidos. ¡Esta acción no se puede deshacer!',
    clearAllConfirm: 'Sí, Limpiar Todo',
    clearAllSuccess: 'Todos los datos fueron limpiados exitosamente',
    clearAllFailed: 'Error al limpiar datos',
    
    // Progress Visualization
    progressOverview: 'Resumen del Progreso',
    completedChunks: 'Completadas',
    failedChunks: 'Fallidas',
    pendingChunks: 'Pendientes',
    translatingChunks: 'Traduciendo',
    totalChunks: 'Total de Partes',
    
    // Glossary Tab
    glossaryManagement: 'Gestión de Glosario',
    addTerm: 'Agregar Término',
    sourceTerm: 'Término de Origen',
    targetTerm: 'Término de Destino',
    category: 'Categoría',
    notes: 'Notas',
    edit: 'Editar',
    delete: 'Eliminar',
    save: 'Guardar',
    cancel: 'Cancelar',
    importCSV: 'Importar CSV',
    exportCSV: 'Exportar CSV',
    searchOnline: 'Buscar Términos en Línea',
    searchTerm: 'Buscar Término',
    search: 'Buscar',
    
    // Settings Tab
    apiConfiguration: 'Configuración de API',
    deeplApiKey: 'Clave de API DeepL',
    openaiApiKey: 'Clave de API OpenAI',
    chatgptApiKey: 'Clave de API ChatGPT',
    outputDirectory: 'Directorio de Salida',
    chunkSize: 'Tamaño de Parte',
    saveSettings: 'Guardar Configuración',
    getCredentials: 'Cómo obtener credenciales',
    
    // API Help Guides
    apiHelpTitle: 'Cómo Obtener Credenciales de API',
    deeplGuide: 'Guía de API DeepL',
    openaiGuide: 'Guía de API OpenAI',
    googleGuide: 'Guía de Google Translate',
    
    // Privacy Modal
    privacyTitle: 'Aviso de Privacidad y Legal',
    privacyLocalStorage: 'Almacenamiento Local y Privacidad',
    privacyLegal: 'Legal y Derechos de Autor',
    privacyApiUsage: 'Uso de API',
    privacyAccept: 'Entiendo y Acepto',
    learnMore: 'Más información',
    
    // Footer
    footerNotice: 'Importante: Este programa es solo para uso personal de traducción. Todas las traducciones se almacenan localmente en tu dispositivo. No usar con fines comerciales o violación de derechos de autor. Respeta los derechos de propiedad intelectual y las leyes aplicables.',
    version: 'Hecho con ❤️ para uso personal',
    
    // Messages
    uploading: 'Subiendo...',
    translating: 'Traduciendo...',
    success: 'Éxito',
    errorOccurred: 'Ocurrió un error',
    confirmDelete: '¿Eliminar este trabajo de traducción? Esto no se puede deshacer.',
    
    // Connection Test
    connectionSuccess: '¡Conexión exitosa!',
    connectionFailed: 'Conexión fallida',
    testing: 'Probando...',
    
    // Languages
    langEnglish: 'Inglés',
    langSpanish: 'Español',
    langFrench: 'Francés',
    langGerman: 'Alemán',
    langItalian: 'Italiano',
    langPortuguese: 'Portugués',
    langRussian: 'Ruso',
    langJapanese: 'Japonés',
    langChinese: 'Chino',
    langArabic: 'Árabe',
    
    // UI Language
    uiLanguage: 'Idioma de la Interfaz',
  }
};

// Get current language from localStorage or default to English
export const getCurrentLanguage = () => {
  return localStorage.getItem('uiLanguage') || 'en';
};

// Set current language
export const setCurrentLanguage = (lang) => {
  if (translations[lang]) {
    localStorage.setItem('uiLanguage', lang);
    return true;
  }
  return false;
};

// Get translation for a key
export const t = (key) => {
  const lang = getCurrentLanguage();
  return translations[lang]?.[key] || translations['en']?.[key] || key;
};

// Get all available languages
export const getAvailableLanguages = () => [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' }
];

export default { t, getCurrentLanguage, setCurrentLanguage, getAvailableLanguages };


