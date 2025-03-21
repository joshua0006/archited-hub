        <button
          onClick={onExportAllPages}
          className="p-1 flex items-center gap-2 rounded hover:bg-blue-100 ml-2 transition-colors duration-200"
          title="Download high-resolution PDF with annotations"
          disabled={isExporting}
        >
          <Download size={20} className={isExporting ? "text-gray-400" : "text-blue-600"} /> 
          Download HD PDF
          {isExporting && (
            <span className="ml-1 text-xs text-gray-500">Exporting...</span>
          )}
        </button> 