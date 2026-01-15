import Link from 'next/link';
import { Palette, Layers, ArrowRight, Figma, FileJson, GitBranch } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">Design Token Studio</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/tokens"
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              Token Editor
            </Link>
            <Link
              href="/components"
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              Component Mapper
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Visual Design Token
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
              {' '}
              Management
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Create, manage, and visualize design tokens using an intuitive node-based interface.
            W3C Design Tokens Format compliant with Figma integration.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/tokens"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              Open Token Editor
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/components"
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Component Mapper
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-4">
              <Palette className="w-6 h-6 text-pink-600 dark:text-pink-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Visual Token Editor</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Create and edit design tokens using a visual node-based interface. See your changes in real-time.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <FileJson className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">W3C DTCG Compliant</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Follows the official W3C Design Tokens Format specification. Export to Style Dictionary and more.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
              <Figma className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Figma Integration</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Import Figma components and visualize which design tokens map to each part of your components.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 mb-20">
          <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold mb-2">Define Tokens</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create design tokens for colors, typography, spacing, and more using the visual editor or JSON.
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold mb-2">Import Components</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Import your Figma component library to see how tokens apply to your actual designs.
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold mb-2">Visualize Mappings</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                See exactly which tokens map to each part of your components with visual arrows and labels.
              </p>
            </div>
          </div>
        </div>

        {/* Token types */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-4">Supported Token Types</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              'color',
              'dimension',
              'fontFamily',
              'fontWeight',
              'typography',
              'shadow',
              'border',
              'duration',
              'cubicBezier',
              'gradient',
            ].map((type) => (
              <span
                key={type}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-medium"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>Design Token Studio - Visual design token management</p>
          <p className="mt-2">
            Built with Next.js, React Flow, and following W3C Design Tokens Format
          </p>
        </div>
      </footer>
    </div>
  );
}
