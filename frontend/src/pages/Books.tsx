import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api';
import { Book, BookCategory } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Upload, FileText, Trash2, 
  FolderPlus, BookOpen, Download, Grid3X3, List,
  Tag, X
} from 'lucide-react';

const CATEGORY_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4',
];

export function Books() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [newBook, setNewBook] = useState({ title: '', author: '', description: '', category_id: '', grade_level: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Category dialog state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '#6366f1' });

  const canManage = user?.role === 'superuser' || user?.role === 'director' || user?.role === 'teacher';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [booksData, categoriesData] = await Promise.all([
        api.getBooks(),
        api.getBookCategories()
      ]);
      setBooks(booksData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBooks = async () => {
    try {
      const data = await api.getBooks(
        selectedCategory ?? undefined,
        undefined,
        searchQuery || undefined
      );
      setBooks(data);
    } catch (error) {
      console.error('Error loading books:', error);
    }
  };

  useEffect(() => {
    loadBooks();
  }, [selectedCategory, searchQuery]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert(t.books.onlyPdf);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        alert(t.books.fileTooLarge);
        return;
      }
      setSelectedFile(file);
      if (!newBook.title) {
        setNewBook(prev => ({ ...prev, title: file.name.replace('.pdf', '') }));
      }
    }
  };

  const handleUploadBook = async () => {
    if (!user || !selectedFile) return;
    setUploading(true);
    setUploadProgress(t.books.uploadingFile);
    
    try {
      const uploadResult = await api.uploadBookFile(selectedFile);
      setUploadProgress(t.books.savingBook);
      
      await api.createBook({
        title: newBook.title,
        author: newBook.author || undefined,
        description: newBook.description || undefined,
        category_id: newBook.category_id ? parseInt(newBook.category_id) : undefined,
        grade_level: newBook.grade_level || undefined,
        file_url: uploadResult.file_url,
        file_name: uploadResult.file_name,
        file_size: uploadResult.file_size,
      }, user.id);
      
      setShowUploadDialog(false);
      setNewBook({ title: '', author: '', description: '', category_id: '', grade_level: '' });
      setSelectedFile(null);
      loadData();
    } catch (error) {
      console.error('Error uploading book:', error);
      alert(t.books.uploadError);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleCreateCategory = async () => {
    if (!user || !newCategory.name) return;
    try {
      await api.createBookCategory({
        name: newCategory.name,
        description: newCategory.description || undefined,
        color: newCategory.color,
      }, user.id);
      setShowCategoryDialog(false);
      setNewCategory({ name: '', description: '', color: '#6366f1' });
      loadData();
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleDeleteBook = async (bookId: number) => {
    if (!user || !confirm(t.books.confirmDelete)) return;
    try {
      await api.deleteBook(bookId, user.id);
      loadData();
    } catch (error) {
      console.error('Error deleting book:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!user || !confirm(t.books.confirmDeleteCategory)) return;
    try {
      await api.deleteBookCategory(categoryId, user.id);
      setSelectedCategory(null);
      loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredBooks = books;
  const allCount = books.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t.books.title}</h1>
          <p className="text-gray-500 mt-1">{t.books.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-gray-600">
                    <FolderPlus className="h-4 w-4 mr-2" />
                    {t.books.newCategory}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t.books.createCategory}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <Input
                      placeholder={t.books.categoryName}
                      value={newCategory.name}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <Input
                      placeholder={t.books.categoryDescription}
                      value={newCategory.description}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                    />
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">{t.books.color}</label>
                      <div className="flex gap-2 flex-wrap">
                        {CATEGORY_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => setNewCategory(prev => ({ ...prev, color }))}
                            className={`w-8 h-8 rounded-full transition-all ${newCategory.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleCreateCategory} disabled={!newCategory.name} className="w-full bg-indigo-600 hover:bg-indigo-700">
                      {t.books.createCategory}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                    <Upload className="h-4 w-4 mr-2" />
                    {t.books.uploadBook}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{t.books.uploadBook}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    {/* File drop zone */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
                    >
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <FileText className="h-10 w-10 text-red-500" />
                          <div className="text-left">
                            <p className="font-medium text-gray-900">{selectedFile.name}</p>
                            <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} className="ml-2 p-1 hover:bg-gray-200 rounded">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 font-medium">{t.books.dropPdf}</p>
                          <p className="text-sm text-gray-400 mt-1">{t.books.maxSize}</p>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </div>

                    <Input
                      placeholder={t.books.bookTitle}
                      value={newBook.title}
                      onChange={(e) => setNewBook(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <Input
                      placeholder={t.books.bookAuthor}
                      value={newBook.author}
                      onChange={(e) => setNewBook(prev => ({ ...prev, author: e.target.value }))}
                    />
                    <Input
                      placeholder={t.books.bookDescription}
                      value={newBook.description}
                      onChange={(e) => setNewBook(prev => ({ ...prev, description: e.target.value }))}
                    />
                    
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        value={newBook.category_id}
                        onChange={(e) => setNewBook(prev => ({ ...prev, category_id: e.target.value }))}
                      >
                        <option value="">{t.books.noCategory}</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                      <select
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        value={newBook.grade_level}
                        onChange={(e) => setNewBook(prev => ({ ...prev, grade_level: e.target.value }))}
                      >
                        <option value="">{t.books.allGrades}</option>
                        <option value="K">Kindergarten</option>
                        <option value="1">Grade 1</option>
                        <option value="2">Grade 2</option>
                        <option value="3">Grade 3</option>
                        <option value="4">Grade 4</option>
                        <option value="5">Grade 5</option>
                        <option value="6">Grade 6</option>
                        <option value="7">Grade 7</option>
                        <option value="8">Grade 8</option>
                      </select>
                    </div>

                    <Button
                      onClick={handleUploadBook}
                      disabled={!selectedFile || !newBook.title || uploading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                      {uploading ? uploadProgress : t.books.uploadBook}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Categories strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            selectedCategory === null
              ? 'bg-gray-900 text-white shadow-lg'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          {t.books.allBooks} ({allCount})
        </button>
        {categories.map(cat => (
          <div key={cat.id} className="relative group">
            <button
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
              style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
              {cat.name} ({cat.book_count})
            </button>
            {canManage && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Search and view toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t.books.searchBooks}
            className="pl-10 bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400'}`}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400'}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Books display */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-20">
          <div className="bg-indigo-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-10 w-10 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{t.books.noBooks}</h3>
          <p className="text-gray-500 mt-1">{canManage ? t.books.uploadFirst : t.books.noBooksAvailable}</p>
          {canManage && (
            <Button onClick={() => setShowUploadDialog(true)} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
              <Upload className="h-4 w-4 mr-2" />
              {t.books.uploadBook}
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View - Apple Books style */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {filteredBooks.map(book => (
            <div key={book.id} className="group relative">
              {/* Book cover */}
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg group-hover:shadow-xl transition-all group-hover:-translate-y-1 cursor-pointer">
                {book.cover_url ? (
                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-white">
                    <FileText className="h-12 w-12 mb-3 opacity-80" />
                    <p className="text-xs font-medium text-center opacity-90 line-clamp-3">{book.title}</p>
                  </div>
                )}
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <a
                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${book.file_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gray-100 transition-colors"
                  >
                    <BookOpen className="h-4 w-4" />
                    {t.books.read}
                  </a>
                  <a
                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${book.file_url}`}
                    download={book.file_name}
                    className="text-white text-xs flex items-center gap-1 hover:underline"
                  >
                    <Download className="h-3 w-3" />
                    {t.books.download}
                  </a>
                  {canManage && (
                    <button
                      onClick={() => handleDeleteBook(book.id)}
                      className="text-red-300 text-xs flex items-center gap-1 hover:text-red-200"
                    >
                      <Trash2 className="h-3 w-3" />
                      {t.common.delete}
                    </button>
                  )}
                </div>

                {/* Category badge */}
                {book.category_name && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="bg-white/90 text-gray-700 text-[10px] backdrop-blur-sm">
                      {book.category_name}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Book info */}
              <div className="mt-3 px-1">
                <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">{book.title}</h3>
                {book.author && (
                  <p className="text-xs text-gray-500 mt-0.5">{book.author}</p>
                )}
                {book.file_size && (
                  <p className="text-[10px] text-gray-400 mt-1">{formatFileSize(book.file_size)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filteredBooks.map(book => (
            <div key={book.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group">
              {/* Mini cover */}
              <div className="w-12 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center">
                {book.cover_url ? (
                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <FileText className="h-6 w-6 text-white opacity-80" />
                )}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{book.title}</h3>
                <div className="flex items-center gap-3 mt-1">
                  {book.author && <span className="text-sm text-gray-500">{book.author}</span>}
                  {book.category_name && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Tag className="h-2.5 w-2.5 mr-1" />
                      {book.category_name}
                    </Badge>
                  )}
                  {book.file_size && (
                    <span className="text-xs text-gray-400">{formatFileSize(book.file_size)}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${book.file_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <BookOpen className="h-4 w-4" />
                </a>
                <a
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${book.file_url}`}
                  download={book.file_name}
                  className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Download className="h-4 w-4" />
                </a>
                {canManage && (
                  <button
                    onClick={() => handleDeleteBook(book.id)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
