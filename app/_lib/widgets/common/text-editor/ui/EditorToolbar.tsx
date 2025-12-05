import { Editor } from '@tiptap/react';
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Quote,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Heading1,
    Heading2,
    Heading3,
    Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEditorImage } from '../model/useEditorImage';

interface EditorToolbarProps {
    editor: Editor | null;
}

export const EditorToolbar = ({ editor }: EditorToolbarProps) => {
    const { addImage } = useEditorImage(editor);

    if (!editor) {
        return null;
    }

    return (
        <div className="border border-input bg-transparent rounded-t-md p-2 flex flex-wrap gap-1 items-center sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            {/* Headings */}
            <div className="flex items-center gap-1 border-r pr-2 mr-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={cn('h-8 w-8 cursor-pointer', editor.isActive('heading', { level: 1 }) && 'bg-muted')}
                    title="Heading 1"
                >
                    <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={cn('h-8 w-8 cursor-pointer', editor.isActive('heading', { level: 2 }) && 'bg-muted')}
                    title="Heading 2"
                >
                    <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={cn('h-8 w-8 cursor-pointer', editor.isActive('heading', { level: 3 }) && 'bg-muted')}
                    title="Heading 3"
                >
                    <Heading3 className="h-4 w-4" />
                </Button>
            </div>

            {/* Basic Formatting */}
            <div className="flex items-center gap-1 border-r pr-2 mr-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    className={cn('h-8 w-8 cursor-pointer', editor.isActive('bold') && 'bg-muted')}
                    title="Bold"
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    className={cn('h-8 w-8 cursor-pointer', editor.isActive('italic') && 'bg-muted')}
                    title="Italic"
                >
                    <Italic className="h-4 w-4" />
                </Button>
            </div>

            {/* Lists & Quote */}
            <div className="flex items-center gap-1 border-r pr-2 mr-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={cn('h-8 w-8 cursor-pointer', editor.isActive('bulletList') && 'bg-muted')}
                    title="Bullet List"
                >
                    <List className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={cn('h-8 w-8 cursor-pointer', editor.isActive('orderedList') && 'bg-muted')}
                    title="Ordered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={cn('h-8 w-8 cursor-pointer', editor.isActive('blockquote') && 'bg-muted')}
                    title="Blockquote"
                >
                    <Quote className="h-4 w-4" />
                </Button>
            </div>

            {/* Alignment */}
            <div className="flex items-center gap-1 border-r pr-2 mr-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={cn('h-8 w-8 cursor-pointer', editor.isActive({ textAlign: 'left' }) && 'bg-muted')}
                    title="Align Left"
                >
                    <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={cn('h-8 w-8 cursor-pointer', editor.isActive({ textAlign: 'center' }) && 'bg-muted')}
                    title="Align Center"
                >
                    <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={cn('h-8 w-8 cursor-pointer', editor.isActive({ textAlign: 'right' }) && 'bg-muted')}
                    title="Align Right"
                >
                    <AlignRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Image */}
            <div className="flex items-center gap-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={addImage}
                    className="h-8 w-8 cursor-pointer"
                    title="Insert Image"
                >
                    <ImageIcon className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};
