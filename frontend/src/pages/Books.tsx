import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api';
import { Book, BookCategory } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, Upload, FileText, Trash2, 
  FolderPlus, BookOpen, Download,
  X, ImagePlus, Camera, Pencil, Check
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
  const [searchQuery, setSearchQuery] = useState('');
  
  // Upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [newBook, setNewBook] = useState({ title: '', author: '', description: '', category_id: '', grade_level: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [selectedCover, setSelectedCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  
  // Cover update for existing books
  const existingCoverInputRef = useRef<HTMLInputElement>(null);
  const [updatingCoverId, setUpdatingCoverId] = useState<number | null>(null);
  
  // Edit book dialog state
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editForm, setEditForm] = useState({ title: '', author: '', description: '', category_id: '', grade_level: '' });
  const [saving, setSaving] = useState(false);
  
  // Category dialog state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '#6366f1' });
  const [creatingCategory, setCreatingCategory] = useState(false);

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
        undefined,
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
  }, [searchQuery]);

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

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert(t.books.onlyImages);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(t.books.coverTooLarge);
        return;
      }
      setSelectedCover(file);
      const reader = new FileReader();
      reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleExistingCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !updatingCoverId) return;
    if (!file.type.startsWith('image/')) {
      alert(t.books.onlyImages);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(t.books.coverTooLarge);
      return;
    }
    try {
      const uploadResult = await api.uploadFile(file);
      await api.updateBookCover(updatingCoverId, uploadResult.file_url, user.id);
      setUpdatingCoverId(null);
      loadData();
    } catch (error) {
      console.error('Error updating cover:', error);
    }
  };

  const handleUploadBook = async () => {
    if (!user || !selectedFile) return;
    setUploading(true);
    setUploadProgress(t.books.uploadingFile);
    
    try {
      const uploadResult = await api.uploadBookFile(selectedFile);
      
      let coverUrl: string | undefined;
      if (selectedCover) {
        setUploadProgress(t.books.uploadingCover);
        const coverResult = await api.uploadFile(selectedCover);
        coverUrl = coverResult.file_url;
      }
      
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
        cover_url: coverUrl,
      }, user.id);
      
      setShowUploadDialog(false);
      setNewBook({ title: '', author: '', description: '', category_id: '', grade_level: '' });
      setSelectedFile(null);
      setSelectedCover(null);
      setCoverPreview(null);
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
    if (!user || !newCategory.name.trim()) return;
    setCreatingCategory(true);
    try {
      await api.createBookCategory({
        name: newCategory.name.trim(),
        description: newCategory.description.trim() || undefined,
        color: newCategory.color,
      }, user.id);
      setShowCategoryDialog(false);
      setNewCategory({ name: '', description: '', color: '#6366f1' });
      await loadData();
    } catch (error) {
      console.error('Error creating category:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`${t.books.createCategory}: ${message}`);
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
    setEditForm({
      title: book.title,
      author: book.author || '',
      description: book.description || '',
      category_id: book.category_id ? String(book.category_id) : '',
      grade_level: book.grade_level || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!user || !editingBook || !editForm.title.trim()) return;
    setSaving(true);
    try {
      await api.updateBook(editingBook.id, {
        title: editForm.title.trim(),
        author: editForm.author.trim() || undefined,
        description: editForm.description.trim() || undefined,
        category_id: editForm.category_id ? parseInt(editForm.category_id) : 0,
        grade_level: editForm.grade_level || undefined,
      }, user.id);
      setEditingBook(null);
      loadData();
    } catch (error) {
      console.error('Error updating book:', error);
    } finally {
      setSaving(false);
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
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const resolveUploadUrl = (url?: string | null): string | undefined => {
    if (!url) return undefined;
    if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) return url;
    return `${apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const groupedBooks = categories
    .map(cat => ({
      category: cat,
      items: filteredBooks.filter(b => b.category_id === cat.id),
    }))
    .filter(g => g.items.length > 0);
  const uncategorizedBooks = filteredBooks.filter(b => !b.category_id);

  const renderBookCard = (book: Book) => (
    <div key={book.id} className="flex-shrink-0 w-[calc((100%-5rem)/5)] min-w-[160px] group">
      {/* Cover (landscape) */}
      <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md group-hover:shadow-xl transition-all group-hover:-translate-y-0.5">
        {book.cover_url ? (
          <img
            src={resolveUploadUrl(book.cover_url)}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-white">
            <FileText className="h-10 w-10 mb-2 opacity-80" />
            <p className="text-xs font-medium text-center opacity-90 line-clamp-2">
              {book.title}
            </p>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
          <a
            href={resolveUploadUrl(book.file_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-gray-900 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gray-100 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            {t.books.read}
          </a>
          <a
            href={resolveUploadUrl(book.file_url)}
            download={book.file_name}
            className="text-white text-xs flex items-center gap-1 hover:underline"
          >
            <Download className="h-3 w-3" />
            {t.books.download}
          </a>
          {canManage && (
            <div className="flex items-center gap-3 mt-1">
              <button
                onClick={() => handleEditBook(book)}
                className="text-white/80 text-xs flex items-center gap-1 hover:text-white"
              >
                <Pencil className="h-3 w-3" />
                {t.books.editBook}
              </button>
              <button
                onClick={() => {
                  setUpdatingCoverId(book.id);
                  existingCoverInputRef.current?.click();
                }}
                className="text-white/80 text-xs flex items-center gap-1 hover:text-white"
              >
                <Camera className="h-3 w-3" />
                {book.cover_url ? t.books.changeCover : t.books.addCover}
              </button>
              <button
                onClick={() => handleDeleteBook(book.id)}
                className="text-red-300 text-xs flex items-center gap-1 hover:text-red-200"
              >
                <Trash2 className="h-3 w-3" />
                {t.common.delete}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title + author name */}
      <div className="mt-3">
        <h3
          className="text-sm font-semibold text-gray-900 truncate"
          title={book.title}
        >
          {book.title}
        </h3>
        {book.author && (
          <p className="text-xs text-gray-500 truncate">
            {t.books.by} {book.author}
          </p>
        )}
      </div>
    </div>
  );

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
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t.books.searchBooks}
              className="pl-10 bg-white rounded-full border-gray-200 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
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
                    <Button
                      onClick={handleCreateCategory}
                      disabled={!newCategory.name.trim() || creatingCategory}
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                      {creatingCategory ? '...' : t.books.createCategory}
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

                    {/* Cover image upload */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">{t.books.coverImage}</label>
                      <div
                        onClick={() => coverInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all"
                      >
                        {coverPreview ? (
                          <div className="flex items-center justify-center gap-3">
                            <img src={coverPreview} alt="Cover preview" className="h-20 w-14 object-cover rounded-lg shadow" />
                            <div className="text-left">
                              <p className="text-sm font-medium text-gray-900">{selectedCover?.name}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(selectedCover?.size ?? null)}</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedCover(null); setCoverPreview(null); }} className="ml-2 p-1 hover:bg-gray-200 rounded">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2 py-1">
                            <ImagePlus className="h-5 w-5 text-gray-400" />
                            <span className="text-sm text-gray-500">{t.books.addCover}</span>
                            <span className="text-xs text-gray-400">({t.books.optional})</span>
                          </div>
                        )}
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCoverSelect}
                        />
                      </div>
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

      {/* Category Rows */}
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
      ) : (
        <div className="space-y-10">
          {groupedBooks.map(({ category, items }) => (
            <section key={category.id}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{category.name}</h2>
                {canManage && (
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                    title={t.common.delete}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
                {items.map(book => renderBookCard(book))}
              </div>
            </section>
          ))}

          {uncategorizedBooks.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{t.books.uncategorized}</h2>
              </div>
              <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
                {uncategorizedBooks.map(book => renderBookCard(book))}
              </div>
            </section>
          )}
        </div>
      )}


      {/* Edit Book Dialog */}
      <Dialog open={!!editingBook} onOpenChange={(open) => { if (!open) setEditingBook(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.books.editBook}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t.books.bookTitle}</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder={t.books.bookTitle}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t.books.bookAuthor}</label>
              <Input
                value={editForm.author}
                onChange={(e) => setEditForm(prev => ({ ...prev, author: e.target.value }))}
                placeholder={t.books.bookAuthor}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t.books.bookDescription}</label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t.books.bookDescription}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t.books.moveToCategory}</label>
              <select
                value={editForm.category_id}
                onChange={(e) => setEditForm(prev => ({ ...prev, category_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">{t.books.noCategory}</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingBook(null)}>{t.common.cancel}</Button>
              <Button onClick={handleSaveEdit} disabled={saving || !editForm.title.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <><Check className="h-4 w-4 mr-1" />{t.common.save}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file input for updating existing book covers */}
      <input
        ref={existingCoverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleExistingCoverSelect}
      />
    </div>
  );
}
