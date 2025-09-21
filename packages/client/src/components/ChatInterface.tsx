import { Image, MessageSquare, Mic, Plus, Send, Trash2, Video } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/chatStore';

interface ChatInterfaceProps {}

export const ChatInterface: React.FC<ChatInterfaceProps> = () => {
   const {
      conversations,
      currentConversationId,
      isLoading,
      error,
      createConversation,
      selectConversation,
      sendMessage,
      generateImage,
      generateAudio,
      generateVideo,
      clearError,
      deleteConversation,
   } = useChatStore();

   const [inputText, setInputText] = useState('');
   const [selectedEndpoint, setSelectedEndpoint] = useState<
      'gemini' | 'uncensored' | 'image' | 'audio' | 'video'
   >('gemini');
   const [imageOptions, setImageOptions] = useState({
      style: 'photorealistic',
      quality: 'high',
      aspectRatio: '1:1',
   });

   const messagesEndRef = useRef<HTMLDivElement>(null);
   const inputRef = useRef<HTMLInputElement>(null);

   const currentConversation = conversations.find((conv) => conv.id === currentConversationId);

   // Auto scroll to bottom
   useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
   }, [currentConversation?.messages]);

   // Focus input
   useEffect(() => {
      inputRef.current?.focus();
   }, [currentConversationId]);

   const handleCreateConversation = () => {
      const newId = createConversation(selectedEndpoint);
      console.log(`✅ Nueva conversación creada: ${newId} (${selectedEndpoint})`);
   };

   const handleSendMessage = async () => {
      if (!inputText.trim() || !currentConversationId) return;

      const message = inputText.trim();
      setInputText('');

      try {
         if (selectedEndpoint === 'image') {
            await generateImage(currentConversationId, message, imageOptions);
         } else if (selectedEndpoint === 'audio') {
            await generateAudio(currentConversationId, message);
         } else if (selectedEndpoint === 'video') {
            await generateVideo(currentConversationId, message);
         } else {
            const options =
               selectedEndpoint === 'gemini'
                  ? {
                       taskType: 'chat',
                       useKnowledgeBase: true,
                    }
                  : {};

            await sendMessage(currentConversationId, message, selectedEndpoint, options);
         }
      } catch (error) {
         console.error('Error enviando mensaje:', error);
      }
   };

   const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
         e.preventDefault();
         handleSendMessage();
      }
   };

   const formatTimestamp = (date: Date) => {
      return new Intl.DateTimeFormat('es-ES', {
         hour: '2-digit',
         minute: '2-digit',
      }).format(date);
   };

   const getEndpointIcon = (endpoint: string) => {
      switch (endpoint) {
         case 'gemini':
            return <MessageSquare className="w-4 h-4" />;
         case 'image':
            return <Image className="w-4 h-4" />;
         case 'audio':
            return <Mic className="w-4 h-4" />;
         case 'video':
            return <Video className="w-4 h-4" />;
         case 'uncensored':
            return <MessageSquare className="w-4 h-4 text-red-500" />;
         default:
            return <MessageSquare className="w-4 h-4" />;
      }
   };

   const getEndpointColor = (endpoint: string) => {
      switch (endpoint) {
         case 'gemini':
            return 'bg-blue-100 text-blue-800 border-blue-200';
         case 'image':
            return 'bg-purple-100 text-purple-800 border-purple-200';
         case 'audio':
            return 'bg-green-100 text-green-800 border-green-200';
         case 'video':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200';
         case 'uncensored':
            return 'bg-red-100 text-red-800 border-red-200';
         default:
            return 'bg-gray-100 text-gray-800 border-gray-200';
      }
   };

   return (
      <div className="flex h-screen bg-gray-50">
         {/* Sidebar */}
         <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
               <h1 className="text-xl font-bold text-gray-800">NoFilter AI</h1>
               <p className="text-sm text-gray-600">Chat multimodal sin censura</p>
            </div>

            {/* Endpoint Selector */}
            <div className="p-4 border-b border-gray-200">
               <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Endpoint:
               </label>
               <select
                  value={selectedEndpoint}
                  onChange={(e) => setSelectedEndpoint(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
               >
                  <option value="gemini">🤖 Gemini 2.5 Pro</option>
                  <option value="uncensored">🔓 Chat Sin Censura</option>
                  <option value="image">🎨 Generar Imágenes</option>
                  <option value="audio">🎵 Generar Audio</option>
                  <option value="video">🎬 Generar Video</option>
               </select>

               {/* Image Options */}
               {selectedEndpoint === 'image' && (
                  <div className="mt-3 space-y-2">
                     <div>
                        <label className="block text-xs text-gray-600">Estilo:</label>
                        <select
                           value={imageOptions.style}
                           onChange={(e) =>
                              setImageOptions({ ...imageOptions, style: e.target.value })
                           }
                           className="w-full p-1 text-sm border border-gray-300 rounded"
                        >
                           <option value="photorealistic">Fotorrealista</option>
                           <option value="artistic">Artístico</option>
                           <option value="cartoon">Cartoon</option>
                           <option value="abstract">Abstracto</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs text-gray-600">Aspecto:</label>
                        <select
                           value={imageOptions.aspectRatio}
                           onChange={(e) =>
                              setImageOptions({ ...imageOptions, aspectRatio: e.target.value })
                           }
                           className="w-full p-1 text-sm border border-gray-300 rounded"
                        >
                           <option value="1:1">Cuadrado (1:1)</option>
                           <option value="16:9">Horizontal (16:9)</option>
                           <option value="9:16">Vertical (9:16)</option>
                           <option value="4:3">Clásico (4:3)</option>
                        </select>
                     </div>
                  </div>
               )}

               <button
                  onClick={handleCreateConversation}
                  className="w-full mt-3 flex items-center justify-center gap-2 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
               >
                  <Plus className="w-4 h-4" />
                  Nueva Conversación
               </button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
               {conversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                     <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                     <p className="text-sm">No hay conversaciones</p>
                     <p className="text-xs">Crea una nueva conversación</p>
                  </div>
               ) : (
                  <div className="p-2 space-y-2">
                     {conversations.map((conv) => (
                        <div
                           key={conv.id}
                           onClick={() => selectConversation(conv.id)}
                           className={`p-3 rounded-lg cursor-pointer transition-colors group relative ${
                              currentConversationId === conv.id
                                 ? 'bg-blue-50 border-l-4 border-blue-500'
                                 : 'hover:bg-gray-50'
                           }`}
                        >
                           <div className="flex items-center gap-2 mb-1">
                              {getEndpointIcon(conv.endpoint)}
                              <span className="font-medium text-sm text-gray-800 truncate">
                                 {conv.title}
                              </span>
                              <span
                                 className={`text-xs px-2 py-0.5 rounded-full border ${getEndpointColor(conv.endpoint)}`}
                              >
                                 {conv.endpoint}
                              </span>
                           </div>
                           <p className="text-xs text-gray-600">
                              {conv.messages.length} mensajes • {formatTimestamp(conv.lastActivity)}
                           </p>

                           {/* Delete Button */}
                           <button
                              onClick={(e) => {
                                 e.stopPropagation();
                                 deleteConversation(conv.id);
                              }}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                           >
                              <Trash2 className="w-3 h-3" />
                           </button>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>

         {/* Main Chat Area */}
         <div className="flex-1 flex flex-col">
            {currentConversation ? (
               <>
                  {/* Chat Header */}
                  <div className="p-4 bg-white border-b border-gray-200">
                     <div className="flex items-center gap-3">
                        {getEndpointIcon(currentConversation.endpoint)}
                        <div>
                           <h2 className="font-semibold text-gray-800">
                              {currentConversation.title}
                           </h2>
                           <p className="text-sm text-gray-600">
                              {currentConversation.messages.length} mensajes
                           </p>
                        </div>
                        <span
                           className={`ml-auto text-xs px-3 py-1 rounded-full border ${getEndpointColor(currentConversation.endpoint)}`}
                        >
                           {currentConversation.endpoint}
                        </span>
                     </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                     {currentConversation.messages.map((message) => (
                        <div
                           key={message.id}
                           className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                           <div
                              className={`max-w-[70%] rounded-lg p-4 ${
                                 message.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : message.metadata?.isError
                                      ? 'bg-red-50 border border-red-200 text-red-800'
                                      : 'bg-white border border-gray-200 text-gray-800'
                              }`}
                           >
                              {/* Mensaje de texto */}
                              <div className="whitespace-pre-wrap">{message.content}</div>
                              {/* Imagen */}
                              {message.type === 'image' && message.imageUrl && (
                                 <div className="mt-3">
                                    <img
                                       src={message.imageUrl}
                                       alt="Imagen generada"
                                       className="max-w-full h-auto rounded-lg shadow-lg"
                                       onError={(e) => {
                                          console.error('Error loading image:', message.imageUrl);
                                          (e.target as HTMLImageElement).style.display = 'none';
                                       }}
                                    />
                                 </div>
                              )}
                              {/* Audio */}
                              {message.type === 'audio' && message.audioUrl && (
                                 <div className="mt-3">
                                    <audio
                                       controls
                                       className="w-full"
                                       onError={(e) => {
                                          console.error('Error loading audio:', message.audioUrl);
                                       }}
                                    >
                                       <source src={message.audioUrl} type="audio/wav" />
                                       Tu navegador no soporta el elemento de audio.
                                    </audio>
                                 </div>
                              )}
                              {/* Video */}
                              {message.type === 'video' && message.videoUrl && (
                                 <div className="mt-3">
                                    <video
                                       controls
                                       className="max-w-full h-auto rounded-lg shadow-lg"
                                       onError={(e) => {
                                          console.error('Error loading video:', message.videoUrl);
                                       }}
                                    >
                                       <source src={message.videoUrl} type="video/mp4" />
                                       Tu navegador no soporta el elemento de video.
                                    </video>
                                 </div>
                              )}{' '}
                              {/* Metadata */}
                              {message.metadata && !message.metadata.isError && (
                                 <div className="mt-2 text-xs opacity-70">
                                    {message.metadata.modelUsed && (
                                       <div>Modelo: {message.metadata.modelUsed}</div>
                                    )}
                                    {message.metadata.provider && (
                                       <div>Proveedor: {message.metadata.provider}</div>
                                    )}
                                 </div>
                              )}
                              <div className="text-xs opacity-50 mt-2">
                                 {formatTimestamp(message.timestamp)}
                              </div>
                           </div>
                        </div>
                     ))}

                     {isLoading && (
                        <div className="flex justify-start">
                           <div className="bg-white border border-gray-200 rounded-lg p-4 text-gray-600">
                              <div className="flex items-center gap-2">
                                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                 <span>Generando respuesta...</span>
                              </div>
                           </div>
                        </div>
                     )}

                     <div ref={messagesEndRef} />
                  </div>

                  {/* Error Banner */}
                  {error && (
                     <div className="p-3 bg-red-50 border-t border-red-200 text-red-800 text-sm">
                        <div className="flex items-center justify-between">
                           <span>❌ {error}</span>
                           <button
                              onClick={clearError}
                              className="text-red-600 hover:text-red-800 font-medium"
                           >
                              Cerrar
                           </button>
                        </div>
                     </div>
                  )}

                  {/* Input Area */}
                  <div className="p-4 bg-white border-t border-gray-200">
                     <div className="flex gap-3">
                        <input
                           ref={inputRef}
                           type="text"
                           value={inputText}
                           onChange={(e) => setInputText(e.target.value)}
                           onKeyPress={handleKeyPress}
                           placeholder={`Escribe tu mensaje para ${selectedEndpoint}...`}
                           className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                           disabled={isLoading}
                        />
                        <button
                           onClick={handleSendMessage}
                           disabled={!inputText.trim() || isLoading}
                           className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                           <Send className="w-4 h-4" />
                           {isLoading ? 'Enviando...' : 'Enviar'}
                        </button>
                     </div>

                     {/* Quick Actions */}
                     <div className="flex gap-2 mt-3">
                        {selectedEndpoint === 'image' && (
                           <div className="flex gap-2 text-xs">
                              <span className="text-gray-600">Estilo:</span>
                              <select
                                 value={imageOptions.style}
                                 onChange={(e) =>
                                    setImageOptions({ ...imageOptions, style: e.target.value })
                                 }
                                 className="border border-gray-300 rounded px-2 py-1"
                              >
                                 <option value="photorealistic">Fotorrealista</option>
                                 <option value="artistic">Artístico</option>
                                 <option value="cartoon">Cartoon</option>
                                 <option value="abstract">Abstracto</option>
                              </select>
                           </div>
                        )}
                     </div>
                  </div>
               </>
            ) : (
               // Welcome Screen
               <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                     <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-10 h-10 text-blue-600" />
                     </div>
                     <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        Bienvenido a NoFilter AI
                     </h2>
                     <p className="text-gray-600 mb-6 max-w-md">
                        Chat multimodal avanzado con Gemini 2.5 Pro. Genera imágenes, procesa audio
                        y video, sin censura.
                     </p>

                     <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mb-6">
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                           <MessageSquare className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                           <div className="text-sm font-medium text-blue-800">Chat Inteligente</div>
                           <div className="text-xs text-blue-600">Gemini 2.5 Pro</div>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                           <Image className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                           <div className="text-sm font-medium text-purple-800">Imágenes</div>
                           <div className="text-xs text-purple-600">Generación Real</div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                           <Mic className="w-6 h-6 text-green-600 mx-auto mb-2" />
                           <div className="text-sm font-medium text-green-800">Audio</div>
                           <div className="text-xs text-green-600">TTS y STT</div>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                           <Video className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                           <div className="text-sm font-medium text-yellow-800">Video</div>
                           <div className="text-xs text-yellow-600">Veo 3.0</div>
                        </div>
                     </div>

                     <button
                        onClick={handleCreateConversation}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
                     >
                        <Plus className="w-4 h-4" />
                        Comenzar Chat
                     </button>
                  </div>
               </div>
            )}
         </div>
      </div>
   );
};
