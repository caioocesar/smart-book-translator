// Internationalization utility for Smart Book Translator Mobile
// Supports: English (en), Portuguese (pt), Spanish (es)
// Adapted from web version for React Native

import AsyncStorage from '@react-native-async-storage/async-storage';

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
    dragDropHint: 'Tap to select a document',
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
    analyzingDocument: 'Analyzing document...',
    
    // Document Info
    documentInfo: 'Document Information',
    fileSize: 'File Size',
    characterCount: 'Characters',
    wordCount: 'Words',
    pages: 'Pages',
    estimatedChunks: 'Estimated Chunks',
    recommendedModels: 'Recommended Models',
    bestChoice: 'Best Choice',
    chunkSize: 'Chunk Size',
    characters: 'chars',
    estimatedCost: 'Estimated Cost',
    supportsGlossary: 'Supports Glossary',
    preservesFormatting: 'Preserves Formatting',
    openaiModel: 'OpenAI Model',
    
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
    retrying: 'Retrying',
    
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
    status: 'Status',
    retries: 'Retries',
    nextRetry: 'Next Retry',
    
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
    searchOnline: 'Search Online',
    searchTerm: 'Search Term',
    search: 'Search',
    
    // Settings Tab
    generalSettings: 'General Settings',
    outputDirectory: 'Output Directory',
    chunkSizeCharacters: 'Chunk Size (characters)',
    deeplApiConfiguration: 'DeepL API Configuration',
    openaiApiConfiguration: 'OpenAI API Configuration',
    deeplApiKey: 'DeepL API Key',
    openaiApiKey: 'OpenAI API Key',
    enterDeeplApiKey: 'Enter DeepL API key',
    enterOpenaiApiKey: 'Enter OpenAI API key',
    saveSettings: 'Save Settings',
    saving: 'Saving...',
    checking: 'Checking...',
    sameAsInput: 'Same as Input',
    plainText: 'Plain Text',
    wordDocument: 'Word Document',
    epubFormat: 'EPUB Format',
    
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
    dragDropHint: 'Toque para selecionar um documento',
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
    analyzingDocument: 'Analisando documento...',
    
    // Document Info
    documentInfo: 'Informações do Documento',
    fileSize: 'Tamanho do Arquivo',
    characterCount: 'Caracteres',
    wordCount: 'Palavras',
    pages: 'Páginas',
    estimatedChunks: 'Chunks Estimados',
    recommendedModels: 'Modelos Recomendados',
    bestChoice: 'Melhor Escolha',
    chunkSize: 'Tamanho do Chunk',
    characters: 'caracteres',
    estimatedCost: 'Custo Estimado',
    supportsGlossary: 'Suporta Glossário',
    preservesFormatting: 'Preserva Formatação',
    openaiModel: 'Modelo OpenAI',
    
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
    retrying: 'Tentando Novamente',
    
    // Job Status
    statusPending: 'Pendente',
    statusTranslating: 'Traduzindo',
    statusCompleted: 'Completado',
    statusFailed: 'Falhou',
    statusPartial: 'Parcial',
    
    // Job Details
    languages: 'Idiomas',
    api: 'API',
    format: 'Formato',
    started: 'Iniciado',
    chunks: 'chunks',
    failed: 'falhou',
    output: 'Saída',
    error: 'Erro',
    
    // Chunk Details
    translationChunks: 'Chunks de Tradução',
    chunkNumber: 'Chunk',
    loadingChunks: 'Carregando chunks...',
    source: 'Origem',
    translation: 'Tradução',
    status: 'Status',
    retries: 'Tentativas',
    nextRetry: 'Próxima Tentativa',
    
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
    searchOnline: 'Buscar Online',
    searchTerm: 'Buscar Termo',
    search: 'Buscar',
    
    // Settings Tab
    generalSettings: 'Configurações Gerais',
    outputDirectory: 'Diretório de Saída',
    chunkSizeCharacters: 'Tamanho do Chunk (caracteres)',
    deeplApiConfiguration: 'Configuração da API DeepL',
    openaiApiConfiguration: 'Configuração da API OpenAI',
    deeplApiKey: 'Chave da API DeepL',
    openaiApiKey: 'Chave da API OpenAI',
    enterDeeplApiKey: 'Digite a chave da API DeepL',
    enterOpenaiApiKey: 'Digite a chave da API OpenAI',
    saveSettings: 'Salvar Configurações',
    saving: 'Salvando...',
    checking: 'Verificando...',
    sameAsInput: 'Mesmo que a Entrada',
    plainText: 'Texto Simples',
    wordDocument: 'Documento Word',
    epubFormat: 'Formato EPUB',
    
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
    dragDropHint: 'Toca para seleccionar un documento',
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
    analyzingDocument: 'Analizando documento...',
    
    // Document Info
    documentInfo: 'Información del Documento',
    fileSize: 'Tamaño del Archivo',
    characterCount: 'Caracteres',
    wordCount: 'Palabras',
    pages: 'Páginas',
    estimatedChunks: 'Chunks Estimados',
    recommendedModels: 'Modelos Recomendados',
    bestChoice: 'Mejor Opción',
    chunkSize: 'Tamaño del Chunk',
    characters: 'caracteres',
    estimatedCost: 'Costo Estimado',
    supportsGlossary: 'Soporta Glosario',
    preservesFormatting: 'Preserva Formato',
    openaiModel: 'Modelo OpenAI',
    
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
    retrying: 'Reintentando',
    
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
    chunks: 'chunks',
    failed: 'fallido',
    output: 'Salida',
    error: 'Error',
    
    // Chunk Details
    translationChunks: 'Chunks de Traducción',
    chunkNumber: 'Chunk',
    loadingChunks: 'Cargando chunks...',
    source: 'Origen',
    translation: 'Traducción',
    status: 'Estado',
    retries: 'Reintentos',
    nextRetry: 'Próximo Reintento',
    
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
    searchOnline: 'Buscar en Línea',
    searchTerm: 'Buscar Término',
    search: 'Buscar',
    
    // Settings Tab
    generalSettings: 'Configuración General',
    outputDirectory: 'Directorio de Salida',
    chunkSizeCharacters: 'Tamaño del Chunk (caracteres)',
    deeplApiConfiguration: 'Configuración de API DeepL',
    openaiApiConfiguration: 'Configuración de API OpenAI',
    deeplApiKey: 'Clave de API DeepL',
    openaiApiKey: 'Clave de API OpenAI',
    enterDeeplApiKey: 'Ingresa la clave de API DeepL',
    enterOpenaiApiKey: 'Ingresa la clave de API OpenAI',
    saveSettings: 'Guardar Configuración',
    saving: 'Guardando...',
    checking: 'Verificando...',
    sameAsInput: 'Igual que la Entrada',
    plainText: 'Texto Plano',
    wordDocument: 'Documento Word',
    epubFormat: 'Formato EPUB',
    
    // Connection Test
    connectionSuccess: 'Conexión exitosa!',
    connectionFailed: 'Fallo en la conexión',
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

let currentLanguage = 'en';

export const getCurrentLanguage = () => {
  return currentLanguage;
};

export const setCurrentLanguage = async (lang) => {
  if (translations[lang]) {
    currentLanguage = lang;
    try {
      await AsyncStorage.setItem('app_language', lang);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  }
};

export const getAvailableLanguages = () => {
  return Object.keys(translations).map(code => ({
    code,
    name: translations[code].langEnglish || code.toUpperCase()
  }));
};

// Initialize language from storage
AsyncStorage.getItem('app_language').then(lang => {
  if (lang && translations[lang]) {
    currentLanguage = lang;
  }
}).catch(() => {});

export const t = (key) => {
  const translation = translations[currentLanguage]?.[key];
  return translation || translations.en[key] || key;
};

export default { t, getCurrentLanguage, setCurrentLanguage, getAvailableLanguages };

