read me:

ffmpeg build; (includes probe) for unix
http://ffmpeg.gusari.org/static/64bit/ffmpeg.static.64bit.latest.tar.gz

for osx
http://www.evermeet.cx/ffmpeg/



--- install ffmpeg via home/brew and add filter as frei0r!
for osx:
brew install ffmpeg --with-frei0r --with-libvpx



for linux
#deependencoies
sudo yum groupinstall 'Development Tools' && sudo yum install curl git m4 ruby texinfo bzip2-devel curl-devel expat-devel ncurses-devel zlib-devel

#install homebrew
ruby -e "$(wget -O- https://raw.github.com/Homebrew/linuxbrew/go/install)"

# have to do everything in ~/.linuxbrew/bin/
brew doctor
# suggested this
echo export PATH='/home/ec2-user/.linuxbrew/bin:$PATH' >> ~/.bash_profile


brew update



-- compile from source:
https://trac.ffmpeg.org/wiki/CompilationGuide/Centos
