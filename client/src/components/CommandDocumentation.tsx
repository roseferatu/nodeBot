import { COMMANDS } from "@/lib/types";

export function CommandDocumentation() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-[#202225]">
        <h3 className="font-semibold text-white">Command Documentation</h3>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto">
        {COMMANDS.map((command, index) => (
          <div key={index} className="mb-6">
            <h4 className="text-[#5865F2] font-medium mb-2">{command.name}</h4>
            <div className="bg-[#36393F] p-3 rounded-md text-sm">
              <p className="text-white">{command.description}</p>
              <div className="mt-2 p-2 bg-black bg-opacity-20 rounded font-mono text-xs text-white">
                {command.example}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
