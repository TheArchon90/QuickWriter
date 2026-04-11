import { motion } from "framer-motion";

interface Props {
  id: string; title: string; updatedAt: string;
  isActive: boolean; onClick: () => void; onDelete: () => void;
}

export default function DocumentItem({ title, isActive, onClick, onDelete }: Props) {
  return (
    <motion.div
      className={`group flex items-center justify-between px-4 py-1.5 cursor-pointer text-sm transition-colors ${
        isActive
          ? "bg-bg-secondary border-l-2 border-accent text-text-primary"
          : "text-text-secondary hover:bg-bg-secondary/50 border-l-2 border-transparent"
      }`}
      onClick={onClick} whileHover={{ x: 2 }} transition={{ duration: 0.15 }}
    >
      <span className="truncate">📄 {title}</span>
      <button
        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-opacity text-xs px-1"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        title="Delete"
      >×</button>
    </motion.div>
  );
}
