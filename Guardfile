# A sample Guardfile
# More info at https://github.com/guard/guard#readme

guard 'rake', :task => 'build' do
  watch(%r{source\/.*\.coffee})
end

guard 'rake', :task => 'build_data' do
  watch(%r{source\/.*\.json})
end
