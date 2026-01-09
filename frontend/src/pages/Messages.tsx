import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Message, Conversation, User } from '../types';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  MessageSquare, Send, Search, Plus, ChevronLeft, Paperclip, X, FileText, Download
} from 'lucide-react';

export function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadConversations();
      loadContacts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedUser && user) {
      loadMessages(selectedUser.id);
      const interval = setInterval(() => loadMessages(selectedUser.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedUser, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    if (!user) return;
    try {
      const data = await api.getConversations(user.id);
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    if (!user) return;
    try {
      const data = await api.getContacts(user.id);
      setContacts(data);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const loadMessages = async (otherUserId: number) => {
    if (!user) return;
    try {
      const data = await api.getMessages(otherUserId, user.id);
      setMessages(data);
      await api.markAllRead(user.id, otherUserId);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !selectedUser || (!newMessage.trim() && !selectedFile)) return;
    
    try {
      setUploading(true);
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      let fileType: string | undefined;
      
      if (selectedFile) {
        const uploadResult = await api.uploadFile(selectedFile);
        fileUrl = uploadResult.file_url;
        fileName = uploadResult.file_name;
        fileType = uploadResult.file_type;
      }
      
      await api.sendMessage(
        selectedUser.id, 
        newMessage || (selectedFile ? `Archivo: ${selectedFile.name}` : ''), 
        user.id,
        fileUrl,
        fileName,
        fileType
      );
      setNewMessage('');
      setSelectedFile(null);
      loadMessages(selectedUser.id);
      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Tamaño máximo: 5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getBackendUrl = () => {
    return import.meta.env.VITE_API_URL || 'http://localhost:8000';
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedUser({ id: conv.user_id, name: conv.user_name });
  };

  const handleStartNewChat = (contact: User) => {
    setSelectedUser({ id: contact.id, name: contact.name });
    setShowNewChat(false);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'director': return 'bg-purple-100 text-purple-700';
      case 'teacher': return 'bg-blue-100 text-blue-700';
      case 'student': return 'bg-green-100 text-green-700';
      case 'parent': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'director': return 'Directora';
      case 'teacher': return 'Profesor';
      case 'student': return 'Estudiante';
      case 'parent': return 'Padre';
      default: return role;
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mensajes</h1>
          <p className="text-gray-500">Comunicacion con profesores y directivos</p>
        </div>
        <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
          <DialogTrigger asChild>
            <Button className="bg-teal-500 hover:bg-teal-600">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Mensaje
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Iniciar Conversacion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar contacto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {filteredContacts.map(contact => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleStartNewChat(contact)}
                    >
                      <Avatar>
                        <AvatarFallback className="bg-teal-100 text-teal-600">
                          {contact.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-gray-500">{contact.email}</p>
                      </div>
                      <Badge className={getRoleBadgeColor(contact.role)}>
                        {getRoleLabel(contact.role)}
                      </Badge>
                    </div>
                  ))}
                  {filteredContacts.length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      No se encontraron contactos
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100%-60px)]">
        {/* Conversations List */}
        <Card className="md:col-span-1 overflow-hidden">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-sm font-medium">Conversaciones</CardTitle>
          </CardHeader>
          <ScrollArea className="h-[calc(100%-50px)]">
            <div className="p-2">
              {conversations.map(conv => (
                <div
                  key={conv.user_id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedUser?.id === conv.user_id 
                      ? 'bg-teal-50 border border-teal-200' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <Avatar>
                    <AvatarFallback className="bg-teal-100 text-teal-600">
                      {conv.user_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{conv.user_name}</p>
                      {conv.unread_count > 0 && (
                        <Badge className="bg-teal-500 text-white text-xs">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{conv.last_message}</p>
                  </div>
                </div>
              ))}
              {conversations.length === 0 && (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No hay conversaciones</p>
                  <p className="text-gray-400 text-xs">Inicia una nueva conversacion</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className="md:col-span-2 flex flex-col overflow-hidden">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <CardHeader className="py-3 border-b flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="md:hidden"
                    onClick={() => setSelectedUser(null)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Avatar>
                    <AvatarFallback className="bg-teal-100 text-teal-600">
                      {selectedUser.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{selectedUser.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.sender_id === user?.id
                            ? 'bg-teal-500 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {msg.file_url && msg.file_type === 'image' && (
                          <a 
                            href={`${getBackendUrl()}${msg.file_url}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block mb-2"
                          >
                            <img 
                              src={`${getBackendUrl()}${msg.file_url}`} 
                              alt={msg.file_name || 'Imagen'} 
                              className="max-w-full rounded-lg max-h-48 object-cover"
                            />
                          </a>
                        )}
                        {msg.file_url && msg.file_type === 'document' && (
                          <a 
                            href={`${getBackendUrl()}${msg.file_url}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 p-2 rounded mb-2 ${
                              msg.sender_id === user?.id 
                                ? 'bg-teal-600 hover:bg-teal-700' 
                                : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                          >
                            <FileText className="h-5 w-5" />
                            <span className="text-sm truncate flex-1">{msg.file_name}</span>
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender_id === user?.id ? 'text-teal-100' : 'text-gray-400'
                        }`}>
                          {new Date(msg.created_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t flex-shrink-0">
                {selectedFile && (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-gray-100 rounded-lg">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600 truncate flex-1">{selectedFile.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={removeSelectedFile}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.xls,.xlsx"
                    className="hidden"
                  />
                  <Button 
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    title="Adjuntar archivo"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input
                    placeholder="Escribe un mensaje..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !uploading && handleSendMessage()}
                    className="flex-1"
                    disabled={uploading}
                  />
                  <Button 
                    className="bg-teal-500 hover:bg-teal-600"
                    onClick={handleSendMessage}
                    disabled={(!newMessage.trim() && !selectedFile) || uploading}
                  >
                    {uploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Selecciona una conversacion
                </h3>
                <p className="text-gray-500 text-sm">
                  O inicia una nueva conversacion con el boton de arriba
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
