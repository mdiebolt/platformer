task :default => [:build]

task :build do
  main_file = "source/main.coffee"
  src_files = (Dir["source/*.coffee"] - [main_file]) + [main_file]

  sh "mkdir -p build"
  sh "coffee", "-bcj", "build/src.js", *src_files
  sh "cat build/data.js lib/*.js build/src.js > game.js"
end

task :build_data do
  require 'json'

  sh "mkdir -p build"

  data_files = Dir["data/*.json"]

  data = {}
  data_files.each do |filename|
    name = File.basename(filename, ".json")
    data[name] = JSON.parse(File.read(filename))
  end

  File.open "build/data.js", "w" do |f|
    f << "Data = "
    f << JSON.dump(data)
    f << ";\n"
  end
end

task :dist => [:build_data, :build] do
  `rm -r #{dist_dir}`
  sh "mkdir -p #{dist_dir}"
  sh "cp run.html #{dist_dir}/index.html"

  %w[images music stylesheets sounds].each do |dir|
    sh "cp -R #{dir} #{dist_dir}/#{dir}"
  end

  # Remove larger source images
  sh "find #{dist_dir}/images -name '*@[248]x.png' -delete"

  %w[jquery.js game.js].each do |file|
    sh "cp #{file} #{dist_dir}/#{file}"
  end

  # Minify js
  # require 'uglifier'
  # File.open "#{dist_dir}/game.js", "w" do |f|
  #   f << Uglifier.compile(File.read("game.js"))
  # end
end

task :package do
  # Package for newgrounds
  `rm build/#{dist_name}.zip`
  sh "cd #{dist_dir} && zip -r #{dist_name}.zip . && mv #{dist_name}.zip .."

  # TODO Package for Chrome webstore

  # TODO Package for direct download
end

# Compiles all sources separately to tmp so we can see good line numbers for errors
task :compile_for_errors do
  sh "coffee -o tmp -c source/*.coffee"
end

task :team_image_rename do
  teams.each do |team|
    `cd images && mkdir -p #{team}; for f in #{team}_*; do mv -f $f #{team}/${f/#{team}_}; done`
  end
end

def dist_name
  "Platform"
end

def dist_dir
  "build/#{dist_name}"
end
